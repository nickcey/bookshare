import socket
import threading
import json
import base64
import time
import logging
from datetime import datetime
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('serveur_cloud.log'),
        logging.StreamHandler()
    ]
)

class CloudServer:
    def __init__(self, host='localhost', port=7000):
        self.host = host
        self.port = port
        self.connected_vms = {}
        self.file_registry = {}
        self.transfer_history = []
        self.lock = threading.Lock()
        self.running = False
        
    def start_server(self):
        """Démarre le serveur cloud"""
        self.running = True
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.bind((self.host, self.port))
        self.socket.listen(5)
        
        logging.info(f"Serveur cloud démarré sur {self.host}:{self.port}")
        print(f"✅ Serveur cloud démarré sur {self.host}:{self.port}")
        print("📡 En attente des connexions des VMs...")
        
        try:
            while self.running:
                try:
                    self.socket.settimeout(1.0)
                    client_socket, address = self.socket.accept()
                    threading.Thread(target=self.handle_vm_connection, 
                                   args=(client_socket, address), daemon=True).start()
                except socket.timeout:
                    continue
        except KeyboardInterrupt:
            logging.info("Arrêt du serveur cloud")
        except Exception as e:
            logging.error(f"Erreur serveur: {e}")
        finally:
            self.socket.close()
    
    def handle_vm_connection(self, client_socket, address):
        """Gère la connexion d'une VM"""
        vm_name = None
        try:
            
            reader = client_socket.makefile("r", encoding="utf-8")
            writer = client_socket.makefile("w", encoding="utf-8")
            
            vm_name = reader.readline().strip()
            
            with self.lock:
                self.connected_vms[vm_name] = {
                    'socket': client_socket,
                    'reader': reader,
                    'writer': writer,
                    'address': address,
                    'join_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            
            logging.info(f"VM connectée: {vm_name} from {address}")
            print(f"🎉 Nouvelle VM connectée: {vm_name}")
            self.list_connected_vms()

            welcome_msg = {"type": "welcome"}
            writer.write(json.dumps(welcome_msg) + "\n")
            writer.flush()
            
            ip_msg = {"type": "ip", "ip": address[0]}
            writer.write(json.dumps(ip_msg) + "\n")
            writer.flush()

            for line in reader:
                if not line:
                    break
                    
                message = json.loads(line.strip())
                self.handle_vm_message(vm_name, message, writer)
                
        except Exception as e:
            logging.error(f"Erreur avec {vm_name}: {e}")
        finally:
            if vm_name:
                with self.lock:
                    if vm_name in self.connected_vms:
                        del self.connected_vms[vm_name]
                client_socket.close()
                logging.info(f"VM déconnectée: {vm_name}")
                print(f"❌ VM déconnectée: {vm_name}")
                self.list_connected_vms()
    
    def handle_vm_message(self, vm_name, message, writer):
        """Traite les messages des VMs"""
        msg_type = message['type']
        
        if msg_type == 'have':
            self.handle_file_have(vm_name, message)
        elif msg_type == 'share':
            self.handle_file_share(vm_name, message)
        elif msg_type == 'share_one':
            self.handle_file_share_one(vm_name, message)
        elif msg_type == 'get':
            self.handle_file_request(vm_name, message)
        elif msg_type == 'file_to':
            self.handle_file_transfer(vm_name, message)
    
    def handle_file_have(self, vm_name, message):
        """Gère l'annonce de possession d'un fichier"""
        file_name = message['file']
        
        with self.lock:
            if file_name not in self.file_registry:
                self.file_registry[file_name] = []
            if vm_name not in self.file_registry[file_name]:
                self.file_registry[file_name].append(vm_name)
        
        logging.info(f"VM {vm_name} a le fichier {file_name}")
        print(f"📁 VM {vm_name} annonce avoir le fichier {file_name}")
    
    def handle_file_share(self, vm_name, message):
        """Gère le partage d'un fichier avec toutes les VMs"""
        file_name = message['file']
        content_b64 = message['content']
        
        logging.info(f"Partage demandé: {file_name} par {vm_name}")
        print(f"🔄 Partage en cours: {file_name} par {vm_name}")

        print("⏳ Diffusion du fichier aux VMs... (7 secondes)")
        time.sleep(7)
        
        with self.lock:
        
            if file_name not in self.file_registry:
                self.file_registry[file_name] = []
            if vm_name not in self.file_registry[file_name]:
                self.file_registry[file_name].append(vm_name)

            for target_vm, vm_info in self.connected_vms.items():
                if target_vm != vm_name:
                    try:
                        file_msg = {
                            "type": "file",
                            "file": file_name,
                            "content": content_b64
                        }
                        vm_info['writer'].write(json.dumps(file_msg) + "\n")
                        vm_info['writer'].flush()
                    except Exception as e:
                        logging.error(f"Erreur envoi à {target_vm}: {e}")
        
        logging.info(f"Fichier {file_name} diffusé à toutes les VMs")
        print(f"✅ Fichier {file_name} diffusé à toutes les VMs")
    
    def handle_file_share_one(self, vm_name, message):
        """Gère le partage d'un fichier avec une VM spécifique"""
        file_name = message['file']
        content_b64 = message['content']
        target_vm = message['to']
        
        logging.info(f"Partage demandé: {file_name} de {vm_name} vers {target_vm}")
        print(f"🔄 Partage spécifique: {file_name} de {vm_name} vers {target_vm}")

        print("⏳ Envoi du fichier à la VM cible... (7 secondes)")
        time.sleep(7)
        
        with self.lock:
     
            if file_name not in self.file_registry:
                self.file_registry[file_name] = []
            if vm_name not in self.file_registry[file_name]:
                self.file_registry[file_name].append(vm_name)

            if target_vm in self.connected_vms:
                try:
                    file_msg = {
                        "type": "file",
                        "file": file_name,
                        "content": content_b64
                    }
                    self.connected_vms[target_vm]['writer'].write(json.dumps(file_msg) + "\n")
                    self.connected_vms[target_vm]['writer'].flush()
                    print(f"✅ Fichier {file_name} envoyé à {target_vm}")
                except Exception as e:
                    logging.error(f"Erreur envoi à {target_vm}: {e}")
                    error_msg = {"type": "error", "message": f"Erreur envoi à {target_vm}"}
                    self.connected_vms[vm_name]['writer'].write(json.dumps(error_msg) + "\n")
                    self.connected_vms[vm_name]['writer'].flush()
            else:
                error_msg = {"type": "error", "message": f"VM {target_vm} non connectée"}
                self.connected_vms[vm_name]['writer'].write(json.dumps(error_msg) + "\n")
                self.connected_vms[vm_name]['writer'].flush()
                print(f"❌ VM {target_vm} non connectée")
    
    def handle_file_request(self, vm_name, message):
        """Gère une demande de fichier"""
        file_name = message['file']
        requesting_vm = message['from']
        
        logging.info(f"Demande de fichier: {file_name} par {requesting_vm}")
        print(f"📥 Demande de fichier: {file_name} par {requesting_vm}")
        
        with self.lock:
            if file_name in self.file_registry and self.file_registry[file_name]:
        
                for vm_with_file in self.file_registry[file_name]:
                    if vm_with_file in self.connected_vms and vm_with_file != requesting_vm:
                     
                        transfer_request = {
                            "type": "send_file",
                            "file": file_name,
                            "to": requesting_vm
                        }
                        
                        try:
                            target_writer = self.connected_vms[vm_with_file]['writer']
                            target_writer.write(json.dumps(transfer_request) + "\n")
                            target_writer.flush()
                            
                            logging.info(f"Demande de transfert: {file_name} de {vm_with_file} vers {requesting_vm}")
                            print(f"🔄 Transfert demandé: {file_name} de {vm_with_file} vers {requesting_vm}")
                            break
                            
                        except Exception as e:
                            logging.error(f"Erreur demande transfert: {e}")
                            continue
                else:
                    error_msg = {"type": "error", "message": f"Aucune VM connectée n'a le fichier {file_name}"}
                    self.connected_vms[requesting_vm]['writer'].write(json.dumps(error_msg) + "\n")
                    self.connected_vms[requesting_vm]['writer'].flush()
                    print(f"❌ Aucune VM n'a le fichier {file_name}")
            else:
                error_msg = {"type": "error", "message": f"Fichier {file_name} non trouvé"}
                self.connected_vms[requesting_vm]['writer'].write(json.dumps(error_msg) + "\n")
                self.connected_vms[requesting_vm]['writer'].flush()
                print(f"❌ Fichier {file_name} non trouvé")
    
    def handle_file_transfer(self, vm_name, message):
        """Gère le transfert direct de fichier entre VMs"""
        file_name = message['file']
        content_b64 = message['content']
        target_vm = message['to']
        
        logging.info(f"Transfert direct: {file_name} de {vm_name} vers {target_vm}")
        print(f"🔄 Transfert direct: {file_name} de {vm_name} vers {target_vm}")

        print("⏳ Transfert en cours... (7 secondes)")
        time.sleep(7)
        
        with self.lock:
            if target_vm in self.connected_vms:
                try:
                    file_msg = {
                        "type": "file",
                        "file": file_name,
                        "content": content_b64
                    }
                    self.connected_vms[target_vm]['writer'].write(json.dumps(file_msg) + "\n")
                    self.connected_vms[target_vm]['writer'].flush()

                    if file_name not in self.file_registry:
                        self.file_registry[file_name] = []
                    if target_vm not in self.file_registry[file_name]:
                        self.file_registry[file_name].append(target_vm)
                    
                    logging.info(f"Fichier {file_name} transféré à {target_vm}")
                    print(f"✅ Fichier {file_name} transféré à {target_vm}")
                    
                except Exception as e:
                    logging.error(f"Erreur transfert à {target_vm}: {e}")
            else:
                error_msg = {"type": "error", "message": f"VM {target_vm} non connectée"}
                self.connected_vms[vm_name]['writer'].write(json.dumps(error_msg) + "\n")
                self.connected_vms[vm_name]['writer'].flush()
                print(f"❌ VM {target_vm} non connectée")
    
    def list_connected_vms(self):
        """Affiche la liste des VMs connectées"""
        with self.lock:
            vm_count = len(self.connected_vms)
            vm_names = list(self.connected_vms.keys())
        
        print(f"\n📊 VMs connectées au serveur ({vm_count}):")
        if vm_names:
            for vm_name in vm_names:
                print(f"   - {vm_name}")
        else:
            print("   Aucune VM connectée")
        print()

def show_loading_message(seconds, message):
    """Affiche un message de chargement"""
    print(f"\n{message}")
    for i in range(seconds, 0, -1):
        print(f"⏳ Veuillez patienter... {i} secondes restantes", end='\r')
        time.sleep(1)
    print(" " * 50, end='\r')

def start_server():
    """Démarre le serveur cloud"""
    server = CloudServer()
    
    print("🚀 Démarrage du serveur cloud...")
    show_loading_message(7, "🔧 Initialisation du serveur...")
    
    server.start_server()

if __name__ == "__main__":
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n🛑 Arrêt du serveur cloud...")
    except Exception as e:
        print(f"❌ Erreur: {e}")