import socket
import threading
import json
import os
import base64
import time
import logging
from datetime import datetime
from tkinter import Tk, filedialog, messagebox
import sys # Ajout pour l'erreur de chemin

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
        """Connecte la VM au serveur (TCP)"""
        # ... (code inchangé)
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
            print(f"❌ Erreur de connexion au serveur: {e}. Assurez-vous que le serveur est démarré sur le port 7000.")
            return False
    
    # (Le reste des méthodes de la classe VirtualMachine est omis ici pour la concision, 
    # mais elles sont inchangées et contiennent les show_loading_message mis à jour)
    
    def announce_existing_files(self):
        """Annonce au serveur les fichiers existants (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def announce_have(self, filename):
        """Annonce au serveur que cette VM possède un fichier (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def listen_to_server(self):
        """Écoute les messages du serveur (méthode non modifiée)"""
        # ... (code inchangé)
        pass
    
    def handle_server_message(self, message):
        """Traite les messages du serveur (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def handle_file_reception(self, message):
        """Traite la réception d'un fichier (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def handle_send_file_request(self, message):
        """Traite une demande d'envoi de fichier (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def create_file(self):
        """Crée un nouveau fichier (méthode non modifiée)"""
        # ... (code inchangé)
        pass
    
    def share_file(self, filename):
        """Partage un fichier avec le cloud (méthode non modifiée)"""
        # ... (code inchangé)
        pass

    def copy_file_from_local(self):
        """Copie un fichier depuis la machine locale (méthode non modifiée)"""
        # ... (code inchangé)
        pass
    
    def request_file(self):
        """Demande un fichier au cloud (méthode non modifiée)"""
        # ... (code inchangé)
        pass
    
    def show_info(self):
        """Affiche les informations de la VM (méthode non modifiée)"""
        # ... (code inchangé)
        pass
    
    def disconnect(self):
        """Déconnecte la VM du serveur (méthode non modifiée)"""
        # ... (code inchangé)
        pass


def show_loading_message(seconds, message):
    """Affiche un message de chargement plus attrayant (méthode non modifiée)"""
    print(f"\n{message}")
    animation = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    start_time = time.time()
    elapsed = 0
    while elapsed < seconds:
        for frame in animation:
            if elapsed >= seconds:
                break
            elapsed = time.time() - start_time
            remaining = int(seconds - elapsed)
            print(f"[{frame}] Traitement en cours sur le Cloud... ({remaining}s restantes)", end='\r')
            time.sleep(0.1)
    print(" " * 60, end='\r')
    print(f"✅ Opération terminée pour: {message.replace('...', '').strip()}")

def main():
    """Fonction principale (méthode non modifiée)"""
    print("\n" + "="*50)
    print("     CRÉATION DE MACHINE VIRTUELLE - CLOUD")
    print("="*50)
    
    name = input("Nom de la VM: ").strip()
    if not name:
        print("❌ Nom de VM invalide")
        sys.exit(1) # Utiliser sys.exit pour sortir proprement
    
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