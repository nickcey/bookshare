import socket
import threading
import json
import os
import base64
import time
import logging
from datetime import datetime
from tkinter import Tk, filedialog, messagebox

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vm_cloud.log'),
        logging.StreamHandler()
    ]
)

SERVER_HOST, SERVER_PORT = "localhost", 7000

class VirtualMachine:
    def __init__(self, name, storage_limit_mb):
        self.name = name
        self.storage_limit = storage_limit_mb * 1024 * 1024  
        self.storage_used = 0
        self.folder = f"vm_{name}"
        self.socket = None
        self.writer = None
        self.reader = None
        self.connected = False
 
        os.makedirs(self.folder, exist_ok=True)

        self.calculate_used_space()
        
        logging.info(f"VM {name} créée - Stockage: {storage_limit_mb}MB")
        print(f"✅ VM {name} créée - Stockage: {storage_limit_mb}MB")
    
    def calculate_used_space(self):
        """Calcule l'espace disque utilisé"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(self.folder):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)
        self.storage_used = total_size
    
    def connect_to_server(self):
        """Connecte la VM au serveur"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((SERVER_HOST, SERVER_PORT))
            self.writer = self.socket.makefile("w", encoding="utf-8")
            self.reader = self.socket.makefile("r", encoding="utf-8")

            self.writer.write(self.name + "\n")
            self.writer.flush()
            
            self.connected = True

            threading.Thread(target=self.listen_to_server, daemon=True).start()

            self.announce_existing_files()
            
            return True
            
        except Exception as e:
            logging.error(f"Erreur de connexion: {e}")
            print(f"❌ Erreur de connexion au serveur: {e}")
            return False
    
    def announce_existing_files(self):
        """Annonce au serveur les fichiers existants"""
        files = [f for f in os.listdir(self.folder) if os.path.isfile(os.path.join(self.folder, f))]
        for filename in files:
            self.announce_have(filename)
    
    def announce_have(self, filename):
        """Annonce au serveur que cette VM possède un fichier"""
        try:
            message = {"type": "have", "file": filename}
            self.writer.write(json.dumps(message) + "\n")
            self.writer.flush()
            logging.info(f"Annonce possession: {filename}")
        except Exception as e:
            logging.error(f"Erreur announce_have: {e}")
    
    def listen_to_server(self):
        """Écoute les messages du serveur"""
        try:
            for line in self.reader:
                if not line:
                    break
                    
                message = json.loads(line.strip())
                self.handle_server_message(message)
                
        except Exception as e:
            logging.error(f"Erreur écoute serveur: {e}")
        finally:
            self.connected = False
    
    def handle_server_message(self, message):
        """Traite les messages du serveur"""
        msg_type = message.get("type")
        
        if msg_type == "welcome":
            print(f"✅ Connecté au serveur cloud")
            logging.info("Connecté au serveur cloud")
            
        elif msg_type == "ip":
            print(f"🌐 Adresse IP: {message.get('ip')}")
            
        elif msg_type == "file":
            self.handle_file_reception(message)
            
        elif msg_type == "error":
            error_msg = message.get("message", "Erreur inconnue")
            print(f"❌ Erreur: {error_msg}")
            logging.error(f"Erreur serveur: {error_msg}")
            
        elif msg_type == "send_file":
            self.handle_send_file_request(message)
    
    def handle_file_reception(self, message):
        """Traite la réception d'un fichier"""
        filename = message.get("file")
        content_b64 = message.get("content")
        
        print(f"📥 Réception du fichier {filename}...")
        logging.info(f"Réception du fichier {filename}")

        print("⏳ Téléchargement en cours... (7 secondes)")
        time.sleep(7)
        
        try:
            content_bytes = base64.b64decode(content_b64)
            file_path = os.path.join(self.folder, filename)

            file_size = len(content_bytes)
            if self.storage_used + file_size > self.storage_limit:
                print(f"❌ Espace disque insuffisant pour {filename}")
                return

            with open(file_path, "wb") as f:
                f.write(content_bytes)
            
            self.storage_used += file_size
            print(f"✅ Fichier '{filename}' reçu ({file_size/1024:.2f} KB)")
            logging.info(f"Fichier {filename} reçu ({file_size/1024:.2f} KB)")

            self.announce_have(filename)
            
        except Exception as e:
            logging.error(f"Erreur réception fichier: {e}")
            print(f"❌ Erreur lors de la réception: {e}")
    
    def handle_send_file_request(self, message):
        """Traite une demande d'envoi de fichier"""
        filename = message.get("file")
        target_vm = message.get("to")
        
        print(f"📤 Demande d'envoi de {filename} à {target_vm}")
        logging.info(f"Demande d'envoi de {filename} à {target_vm}")
        
        file_path = os.path.join(self.folder, filename)
        if not os.path.exists(file_path):
            print(f"❌ Fichier {filename} introuvable")
            return
        
        try:
            with open(file_path, "rb") as f:
                content_bytes = f.read()
            
            content_b64 = base64.b64encode(content_bytes).decode("utf-8")
            
            transfer_msg = {
                "type": "file_to",
                "file": filename,
                "content": content_b64,
                "to": target_vm
            }
            
            self.writer.write(json.dumps(transfer_msg) + "\n")
            self.writer.flush()
            
            print(f"✅ Fichier {filename} envoyé à {target_vm}")
            logging.info(f"Fichier {filename} envoyé à {target_vm}")
            
        except Exception as e:
            logging.error(f"Erreur envoi fichier: {e}")
            print(f"❌ Erreur lors de l'envoi: {e}")
    
    def create_file(self):
        """Crée un nouveau fichier"""
        filename = input("Nom du fichier: ").strip()
        if not filename:
            print("❌ Nom de fichier invalide")
            return
        
        try:
            size = int(input("Taille du fichier (octets): ").strip())
        except ValueError:
            print("❌ Taille invalide")
            return

        if self.storage_used + size > self.storage_limit:
            print("❌ Espace disque insuffisant")
            return
        
        file_path = os.path.join(self.folder, filename)

        with open(file_path, "wb") as f:
            f.write(b"0" * size)
        
        self.storage_used += size
        print(f"✅ Fichier '{filename}' créé ({size} octets)")
        logging.info(f"Fichier {filename} créé ({size} octets)")

        self.announce_have(filename)
       
        print("🔄 Partage automatique avec toutes les VMs...")
        self.share_file(filename)
    
    def share_file(self, filename):
        """Partage un fichier avec le cloud"""
        file_path = os.path.join(self.folder, filename)
        if not os.path.exists(file_path):
            print(f"❌ Fichier {filename} introuvable")
            return
        
        print("⏳ Préparation du partage... (7 secondes)")
        time.sleep(7)
        
        try:
            with open(file_path, "rb") as f:
                content_bytes = f.read()
            
            content_b64 = base64.b64encode(content_bytes).decode("utf-8")
            
            share_msg = {
                "type": "share",
                "file": filename,
                "content": content_b64
            }
            
            self.writer.write(json.dumps(share_msg) + "\n")
            self.writer.flush()
            
            print(f"✅ Fichier '{filename}' partagé avec toutes les VMs")
            logging.info(f"Fichier {filename} partagé")
            
        except Exception as e:
            logging.error(f"Erreur partage fichier: {e}")
            print(f"❌ Erreur lors du partage: {e}")
    
    def copy_file_from_local(self):
        """Copie un fichier depuis la machine locale"""
        root = Tk()
        root.withdraw()
        file_path = filedialog.askopenfilename(title="Sélectionner un fichier à copier")
        root.destroy()
        
        if not file_path:
            print("❌ Aucun fichier sélectionné")
            return
        
        try:
            with open(file_path, "rb") as f:
                content_bytes = f.read()
            
            file_size = len(content_bytes)
            filename = os.path.basename(file_path)

            if self.storage_used + file_size > self.storage_limit:
                print("❌ Espace disque insuffisant")
                return

            dest_path = os.path.join(self.folder, filename)
            with open(dest_path, "wb") as f:
                f.write(content_bytes)
            
            self.storage_used += file_size
            print(f"✅ Fichier '{filename}' copié ({file_size/1024:.2f} KB)")
            logging.info(f"Fichier {filename} copié ({file_size/1024:.2f} KB)")

            self.announce_have(filename)

            choice = input("Voulez-vous partager ce fichier ? (o/n): ").strip().lower()
            if choice == 'o':
                self.share_file(filename)
            
        except Exception as e:
            logging.error(f"Erreur copie fichier: {e}")
            print(f"❌ Erreur lors de la copie: {e}")
    
    def request_file(self):
        """Demande un fichier au cloud"""
        filename = input("Nom du fichier à demander: ").strip()
        if not filename:
            print("❌ Nom de fichier invalide")
            return
        
        request_msg = {
            "type": "get",
            "file": filename,
            "from": self.name
        }
        
        self.writer.write(json.dumps(request_msg) + "\n")
        self.writer.flush()
        
        print(f"📥 Demande du fichier '{filename}' envoyée")
        logging.info(f"Demande du fichier {filename}")
    
    def show_info(self):
        """Affiche les informations de la VM"""
        used_mb = self.storage_used / (1024 * 1024)
        limit_mb = self.storage_limit / (1024 * 1024)
        free_mb = limit_mb - used_mb
        usage_percent = (used_mb / limit_mb) * 100
        
        print(f"\n--- INFORMATIONS DE LA VM {self.name} ---")
        print(f"Stockage utilisé: {used_mb:.2f} MB / {limit_mb:.2f} MB")
        print(f"Stockage libre: {free_mb:.2f} MB")
        print(f"Taux d'utilisation: {usage_percent:.1f}%")
        print(f"Dossier: {self.folder}")
        print(f"Statut: {'✅ Connectée' if self.connected else '❌ Déconnectée'}")
        
        files = os.listdir(self.folder)
        print(f"Fichiers locaux: {len(files)}")
        for file in files:
            file_path = os.path.join(self.folder, file)
            size = os.path.getsize(file_path)
            print(f"  - {file} ({size} octets)")
    
    def disconnect(self):
        """Déconnecte la VM du serveur"""
        if self.socket:
            self.socket.close()
        self.connected = False
        print("🔌 Déconnecté du serveur cloud")
        logging.info("Déconnecté du serveur cloud")

def show_loading_message(seconds, message):
    """Affiche un message de chargement"""
    print(f"\n{message}")
    for i in range(seconds, 0, -1):
        print(f"⏳ Veuillez patienter... {i} secondes restantes", end='\r')
        time.sleep(1)
    print(" " * 50, end='\r')

def main():
    """Fonction principale"""
    print("\n" + "="*50)
    print("     CRÉATION DE MACHINE VIRTUELLE - CLOUD")
    print("="*50)
    
    name = input("Nom de la VM: ").strip()
    if not name:
        print("❌ Nom de VM invalide")
        return
    
    try:
        storage_mb = int(input("Capacité de stockage (MB): ").strip())
    except ValueError:
        print("❌ Capacité invalide, utilisation de 500MB par défaut")
        storage_mb = 500

    show_loading_message(7, "🚀 Création de la VM en cours...")
    vm = VirtualMachine(name, storage_mb)
 
    show_loading_message(7, "🔗 Connexion au serveur cloud...")
    if not vm.connect_to_server():
        return

    while True:
        print(f"\n{'='*50}")
        print(f"     GESTION DE LA VM: {name}")
        print(f"{'='*50}")
        print("1. Créer un fichier (partage automatique)")
        print("2. Copier un fichier local")
        print("3. Demander un fichier au cloud")
        print("4. Informations de la VM")
        print("5. Quitter")
        
        choice = input("\nVotre choix (1-5): ").strip()
        
        if choice == "1":
            vm.create_file()
        elif choice == "2":
            vm.copy_file_from_local()
        elif choice == "3":
            vm.request_file()
        elif choice == "4":
            vm.show_info()
        elif choice == "5":
            vm.disconnect()
            break
        else:
            print("❌ Choix invalide")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Arrêt de la VM...")
    except Exception as e:
        print(f"❌ Erreur: {e}")