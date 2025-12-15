import socket
import threading
import json
import base64
import time
import logging
from datetime import datetime, timedelta
import os
import random 

import smtplib 
from email.mime.text import MIMEText 
from email.header import Header
from flask import Flask, request, jsonify, render_template 
import mysql.connector
import bcrypt 

app = Flask(__name__, template_folder='frontend', static_folder='frontend/static')

logging.basicConfig(
    filename='serveur_cloud.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logging.getLogger().addHandler(logging.StreamHandler())


VOTRE_EMAIL = "amougoubrayan14@gmail.com" 

VOTRE_MOT_DE_PASSE = "rnmeybbwtsjgoaoo " 
VOTRE_SMTP_HOST = "smtp.gmail.com" 
VOTRE_SMTP_PORT = 587 

DB_CONFIG = {
    'user': 'root',    
    'password': '',       
    'host': '127.0.0.1',
    'database': 'nick_cloud_db'
}
cloud_server_instance = None

def show_loading_message(duration, message):
    """Affiche une barre de chargement de progression dans la console."""
    print(f"\n[🔄] {message}")
    for i in range(duration):
        progress = int((i + 1) / duration * 100)
        bar_length = 20
        filled = int(bar_length * (i + 1) / duration)
        bar = '█' * filled + '░' * (bar_length - filled)
        
        print(f"\r[ {bar} ] {progress}%", end="", flush=True)
        time.sleep(1)
    print(f"\r[✅] Opération terminée pour: {message}")

def get_db_connection():
    """Établit la connexion à la base de données."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        logging.error(f"Erreur de connexion à la BD: {err}")
        print(f"❌ ERREUR BD: Vérifiez que MySQL est démarré dans XAMPP. Détail: {err}")
        return None

def store_confirmation_code(email, code, vm_data):
    """Stocke le code de confirmation et les données de VM temporairement."""
    conn = get_db_connection()
    if not conn: return False
    
    cursor = conn.cursor()
    expires_at = datetime.now() + timedelta(hours=1) 
    data_json = json.dumps(vm_data)
    
    query = """
    INSERT INTO confirmation_codes (email, code, data_json, expires_at)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE code=%s, data_json=%s, expires_at=%s
    """
    try:
        cursor.execute(query, (email, code, data_json, expires_at, code, data_json, expires_at))
        conn.commit()
        return True
    except mysql.connector.Error as err:
        logging.error(f"Erreur de stockage du code: {err}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_confirmation_data(email, code):
    """Récupère et valide le code de confirmation."""
    conn = get_db_connection()
    if not conn: return None
    
    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT data_json, expires_at FROM confirmation_codes
    WHERE email = %s AND code = %s AND expires_at > NOW()
    """
    
    try:
        cursor.execute(query, (email, code))
        result = cursor.fetchone()
        
        if result:
         
            delete_query = "DELETE FROM confirmation_codes WHERE email = %s"
            cursor.execute(delete_query, (email,))
            conn.commit()
            
            return json.loads(result['data_json'])
        return None
        
    except mysql.connector.Error as err:
        logging.error(f"Erreur de récupération du code: {err}")
        return None
    finally:
        cursor.close()
        conn.close()

def create_vm_record(vm_name, email, password, storage_mb):
    """Insère l'enregistrement permanent de la VM."""
    conn = get_db_connection()
    if not conn: return False
    
    cursor = conn.cursor()

    password_bytes = password.encode('utf-8')
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

    query = """
    INSERT INTO virtual_machines (vm_name, email, password_hash, storage_mb)
    VALUES (%s, %s, %s, %s)
    """
    try:
        cursor.execute(query, (vm_name, email, hashed_password, storage_mb))
        conn.commit()
        return True
    except mysql.connector.IntegrityError:
       
        return False
    except mysql.connector.Error as err:
        logging.error(f"Erreur de création de la VM dans la BD: {err}")
        return False
    finally:
        cursor.close()
        conn.close()

def verify_vm_login(vm_name, password):
    """
    Vérifie le nom de la VM et le mot de passe pour la connexion.
    Retourne {'error': ...} en cas d'erreur système, ou les infos VM en cas de succès, ou None en cas d'échec d'authentification.
    """
    conn = get_db_connection()

    if not conn: 
        return {'error': 'DB_CONNECTION_FAILED'}
    
    cursor = conn.cursor(dictionary=True)
    query = "SELECT password_hash, storage_mb FROM virtual_machines WHERE vm_name = %s"
    
    try:
        cursor.execute(query, (vm_name,))
        result = cursor.fetchone()
        
        if result:
            stored_hash = result['password_hash'].encode('utf-8')
            password_bytes = password.encode('utf-8')
   
            if bcrypt.checkpw(password_bytes, stored_hash):
                return {'vm_name': vm_name, 'storage': result['storage_mb']}
     
        return None
        
    except Exception as e:
        
        logging.error(f"Erreur de vérification de connexion (Exception): {e}")
        return {'error': 'SYSTEM_ERROR'}
    finally:
        cursor.close()
        conn.close()


def generate_confirmation_code(length=6):
    """Génère un code de confirmation numérique aléatoire."""
    return ''.join(random.choices('0123456789', k=length))

def send_confirmation_email(recipient_email, code, vm_name, vm_data):
    """Envoie l'e-mail de confirmation et stocke temporairement les données."""
    
    subject = f"Cloud System - Votre code de vérification pour {vm_name}"
    
    body = f"""
    Bonjour,
    
    Merci de votre inscription au Cloud System.
    
    Votre code de vérification est : {code}
    
    Ce code est valide pendant 1 heure. Veuillez le saisir sur la page de confirmation pour finaliser la création de votre Machine Virtuelle ({vm_name}).
    
    L'équipe Cloud System.
    """
    
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = VOTRE_EMAIL
    msg['To'] = recipient_email
    
    print(f"\n🔄 Tentative d'envoi du code '{code}' à {recipient_email} pour {vm_name}...")
    logging.info(f"Tentative d'envoi d'e-mail à {recipient_email}")

    success = False
    try:
        with smtplib.SMTP(VOTRE_SMTP_HOST, VOTRE_SMTP_PORT) as server:
            server.starttls()  
            server.login(VOTRE_EMAIL, VOTRE_MOT_DE_PASSE)
            server.sendmail(VOTRE_EMAIL, recipient_email, msg.as_string())
            success = True
            print(f"✅ E-mail envoyé avec succès à {recipient_email}.")
            logging.info(f"E-mail envoyé avec succès à {recipient_email}.")

    except smtplib.SMTPAuthenticationError:
        print("❌ ERREUR SMTP: Erreur d'authentification. Vérifiez le Mot de Passe d'Application Gmail.")
        logging.error("Erreur d'authentification SMTP.")
    except Exception as e:
        print(f"❌ ERREUR SMTP: Impossible d'envoyer l'e-mail. Détail: {e}")
        logging.error(f"Échec de l'envoi d'e-mail: {e}")

    if success:
   
        if store_confirmation_code(recipient_email, code, vm_data):
            return True
        else:
            print("❌ ERREUR BD: Échec du stockage du code après l'envoi d'e-mail.")
            return False
    else:
        return False

class ClientThread(threading.Thread):
    def __init__(self, client_socket, client_address, server_instance):
        threading.Thread.__init__(self)
        self.client_socket = client_socket
        self.client_address = client_address
        self.server_instance = server_instance
        logging.info(f"Nouvelle connexion TCP: {client_address}")

    def run(self):
        vm_name = "Inconnu"
        try:
          
            initial_data = self.client_socket.recv(1024).decode('utf-8')
            if initial_data.startswith("VM_INIT:"):
                vm_name = initial_data.split(":")[1].strip()
                self.server_instance.active_vms[vm_name] = self.client_socket
                logging.info(f"VM connectée et identifiée: {vm_name} ({self.client_address})")
                self.client_socket.sendall(f"Bienvenue, {vm_name}. Connecté au Cloud.".encode('utf-8'))
            else:
                self.client_socket.sendall("Format d'initialisation VM invalide.".encode('utf-8'))
                return
            while True:
                data = self.client_socket.recv(1024)
                if not data:
                    break
                
                command = data.decode('utf-8').strip()
                logging.info(f"Commande reçue de {vm_name}: {command}")
                
                response = self.server_instance.handle_command(vm_name, command)
                self.client_socket.sendall(response.encode('utf-8'))

        except ConnectionResetError:
            logging.warning(f"Connexion réinitialisée par le client {vm_name} ({self.client_address}).")
        except Exception as e:
            logging.error(f"Erreur de communication avec {vm_name}: {e}")
        finally:
            if vm_name in self.server_instance.active_vms:
                del self.server_instance.active_vms[vm_name]
            logging.info(f"VM déconnectée: {vm_name} ({self.client_address})")


class CloudServer:
    def __init__(self, host='0.0.0.0', port=7000):
        self.host = host
        self.port = port
        self.active_vms = {} 
        self.cloud_files = {} 
        self.server_socket = None

    def start_server(self):
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            print(f"✅ Serveur cloud TCP démarré sur {self.host}:{self.port}")
            print("📡 En attente des connexions des VMs...")
            logging.info(f"Serveur Cloud démarré sur {self.host}:{self.port}")

            while True:
                client_socket, client_address = self.server_socket.accept()
                new_thread = ClientThread(client_socket, client_address, self)
                new_thread.start()

        except socket.error as e:
            logging.critical(f"Erreur lors du démarrage du serveur TCP: {e}")

        finally:
            if self.server_socket:
                self.server_socket.close()

    def handle_command(self, vm_name, command):
     
        parts = command.split(' ', 1)
        action = parts[0]
 
        if action == "ANNOUNCE":
            if len(parts) == 2:
                filename = parts[1]
                if filename not in self.cloud_files:
                    self.cloud_files[filename] = []
                if vm_name not in self.cloud_files[filename]:
                    self.cloud_files[filename].append(vm_name)
                    logging.info(f"Fichier '{filename}' annoncé par {vm_name}.")
                    return f"ANNOUNCE_OK Fichier '{filename}' enregistré dans le Cloud."
                return "ANNOUNCE_WARN Fichier déjà annoncé."
            return "ANNOUNCE_ERROR Format invalide."
    
        return "ERROR Commande inconnue."

@app.route('/')
def index():
    """Route pour servir le template principal."""
    return render_template('index.html')

@app.route('/send_code', methods=['POST'])
def send_code():
    """Génère et envoie le code de confirmation (utilise la BD temporaire)."""
    data = request.get_json()
    email = data.get('vmEmail')
    vm_name = data.get('vmName') 
    
    vm_data = {
        'vmName': vm_name,
        'vmEmail': email,
        'vmPassword': data.get('vmPassword'),
        'vmStorage': data.get('vmStorage')
    }

    if not email or not vm_name:
        return jsonify({"success": False, "message": "Email ou nom de VM manquant."}), 400

    code = generate_confirmation_code()
    
    if send_confirmation_email(email, code, vm_name, vm_data):
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Échec de l'envoi de l'e-mail ou du stockage du code."}), 500

@app.route('/register_vm', methods=['POST'])
def register_vm():
    """Route pour la création réelle de la VM après confirmation (BD permanente)."""
    data = request.get_json()
    vmEmail = data.get('vmEmail')
    enteredCode = data.get('enteredCode')

    vm_data = get_confirmation_data(vmEmail, enteredCode)
    
    if not vm_data:
        return jsonify({"success": False, "message": "Code de confirmation invalide, expiré ou déjà utilisé."}), 401
  
    show_loading_message(7, f"🚀 Création de la VM '{vm_data['vmName']}' en cours...")
    
    storage_mb = int(vm_data['vmStorage'].replace('MB', '')) 
    success = create_vm_record(
        vm_data['vmName'], 
        vm_data['vmEmail'], 
        vm_data['vmPassword'],
        storage_mb
    )
    
    if success:
        return jsonify({"success": True, "message": "VM créée avec succès."})
    else:
        return jsonify({"success": False, "message": "Erreur: Le nom de VM ou l'e-mail existe déjà."}), 409


@app.route('/login', methods=['POST'])
def login():
    """Route de connexion (Vérification dans la BD)."""
    data = request.get_json()
    vm_name = data.get('vmName')
    password = data.get('password')
    
    if not vm_name or not password:
        return jsonify({"success": False, "message": "Nom de VM et mot de passe requis."}), 400

    vm_info = verify_vm_login(vm_name, password)
    
    if vm_info and 'error' in vm_info:
        logging.error(f"Erreur système lors de la connexion : {vm_info['error']}")
        
        return jsonify({"success": False, "message": "Erreur interne du serveur. Vérifiez la connexion à la Base de Données (XAMPP)."}), 500
    
    if vm_info:
       
        return jsonify({
            "success": True, 
            "message": "Connexion réussie.",
            "vm_name": vm_info['vm_name'],
            "storage": f"{vm_info['storage']}MB"
        })
    else:
    
        return jsonify({"success": False, "message": "Nom de VM ou mot de passe invalide."}), 401


def start_servers():
    """Démarre les deux serveurs (TCP Cloud et HTTP Flask)"""
    global cloud_server_instance

    cloud_server_instance = CloudServer()
    threading.Thread(target=cloud_server_instance.start_server, daemon=True).start()
    
    print("\n🚀 Démarrage du serveur web Flask (pour le frontend)...")
   
    app.run(host='0.0.0.0', port=5000)

if __name__ == "__main__":
    try:
        show_loading_message(7, "🔧 Initialisation du système Cloud...")
        start_servers()
    except KeyboardInterrupt:
        print("\n\n🛑 Arrêt des serveurs...")
    except Exception as e:
        print(f"❌ Erreur critique lors du démarrage: {e}")