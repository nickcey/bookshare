import threading
import json
import base64
import time
import logging
import os
from datetime import datetime
from flask import Flask, jsonify, request, render_template, send_from_directory, abort
from flask_cors import CORS
import re
import hashlib
import shutil

PUBLIC_SHARE_FOLDER = "cloud_public_share"
os.makedirs(PUBLIC_SHARE_FOLDER, exist_ok=True)

class CloudCore:
    def __init__(self):
       
        self.connected_vms = {}
       
        self.file_registry = {}
        self.lock = threading.Lock()
        
    def _hash_password(self, password):
        """Simule le hachage d'un mot de passe (pour l'exemple)"""
        
        return hashlib.sha256(password.encode()).hexdigest()

    def _verify_password(self, stored_hash, provided_password):
        """Vérifie le mot de passe (pour l'exemple)"""
        return stored_hash == self._hash_password(provided_password)

    def add_vm(self, vm_name, email, password, storage_limit_mb):
        """Création d'une VM (Inscription) avec mot de passe et email"""
        with self.lock:
            if vm_name in self.connected_vms:
                return {"status": "error", "message": "Ce nom de compte/VM est déjà utilisé."}
            
            storage_mb = storage_limit_mb if storage_limit_mb > 0 else 500
            password_hash = self._hash_password(password)
            
            self.connected_vms[vm_name] = {
                'name': vm_name,
                'email': email,
                'password_hash': password_hash,
                'storage_limit': storage_mb * 1024 * 1024,
                'storage_used': 0,
                'join_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'files': []
            }
          
            os.makedirs(f"vm_{vm_name}", exist_ok=True)
            return {"status": "success", "vm": self.connected_vms[vm_name]}

    def get_vm_details(self, vm_name, password=None):
        """Récupère les détails d'une VM et vérifie le mot de passe (Connexion)"""
        with self.lock:
            vm = self.connected_vms.get(vm_name)
            if vm and password:
                if self._verify_password(vm['password_hash'], password):
                    
                    vm_safe = vm.copy()
                    vm_safe.pop('password_hash', None)
                    return vm_safe
                else:
                    return None 
            return vm

    def upload_file(self, vm_name, file_name, content_b64, is_private_store, is_public_share):
        """Upload et partage un fichier, avec option privé, public_seul, ou les deux."""
        with self.lock:
            if vm_name not in self.connected_vms:
                return {"status": "error", "message": "VM non trouvée"}
            
            if not is_private_store and not is_public_share:
                return {"status": "error", "message": "Aucune option de stockage ou de partage sélectionnée."}

            try:
                content_bytes = base64.b64decode(content_b64)
            except:
                return {"status": "error", "message": "Contenu du fichier invalide (Base64)"}

            file_size = len(content_bytes)
            vm = self.connected_vms[vm_name]

            if is_private_store:

                if vm['storage_used'] + file_size > vm['storage_limit']:
                    return {"status": "error", "message": "Limite de stockage privée dépassée."}
                
                file_path_private = os.path.join(f"vm_{vm_name}", file_name)
                with open(file_path_private, "wb") as f:
                    f.write(content_bytes)
                if file_name not in vm['files']:
                    vm['storage_used'] += file_size
                    vm['files'].append(file_name)
            if is_public_share:
                file_path_public = os.path.join(PUBLIC_SHARE_FOLDER, file_name)

                with open(file_path_public, "wb") as f:
                    f.write(content_bytes)

                if file_name not in self.file_registry:
                    self.file_registry[file_name] = []
                if vm_name not in self.file_registry[file_name]:
                    self.file_registry[file_name].append(vm_name)

            return {"status": "success", "file_size": file_size, "private": is_private_store, "shared": is_public_share}

app = Flask(__name__, static_folder="frontend/static", template_folder="frontend")
CORS(app) 
cloud_core = CloudCore()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/vm', methods=['POST'])
def create_new_vm():
    """Crée une nouvelle VM (Inscription) avec sécurité"""
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    storage_mb = int(data.get('storage_mb', 500)) if str(data.get('storage_mb', '500')).isdigit() else 500
    
    if not name or len(name) < 3 or not email or not password:
        return jsonify({"status": "error", "message": "Tous les champs sont requis."}), 400

    if len(password) < 8:
        return jsonify({"status": "error", "message": "Le mot de passe doit contenir au moins 8 caractères."}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"status": "error", "message": "Le mot de passe doit contenir au moins une majuscule."}), 400
    if not re.search(r"[!@#$%^&*(),.?:{}|<>]", password):
        return jsonify({"status": "error", "message": "Le mot de passe doit contenir au moins un caractère spécial (!@#$...). "}), 400
    if not re.search(r"\d", password):
        return jsonify({"status": "error", "message": "Le mot de passe doit contenir au moins un chiffre."}), 400

    result = cloud_core.add_vm(name, email, password, storage_mb)
    if result['status'] == 'success':
        return jsonify({"message": f"Compte VM '{name}' créé avec succès"}), 201
    else:
        return jsonify(result), 400

@app.route('/api/vm/login', methods=['POST'])
def login_vm():
    """Connexion à la VM (Vérification)"""
    data = request.json
    name = data.get('name')
    password = data.get('password')
    
    if not name or not password:
        return jsonify({"status": "error", "message": "Nom de VM et mot de passe requis."}), 400
        
    vm = cloud_core.get_vm_details(name, password)
    if vm:
        return jsonify(vm), 200
    else:
        return jsonify({"status": "error", "message": "Nom de VM ou mot de passe invalide."}), 401

@app.route('/api/vm/<vm_name>', methods=['GET'])
def get_single_vm(vm_name):
    """Récupère les détails d'une VM (Pour le Dashboard)"""
    vm = cloud_core.get_vm_details(vm_name)
    if vm:
       
        vm_safe = vm.copy()
        vm_safe.pop('password_hash', None)
        return jsonify(vm_safe), 200
    else:
        return jsonify({"status": "error", "message": f"Compte/VM '{vm_name}' non trouvé."}), 404

@app.route('/api/vm/<vm_name>/upload', methods=['POST'])
def upload_vm_file(vm_name):
    """Upload et partage un fichier avec option de stockage privé/public"""
    data = request.json
    file_name = data.get('file_name')
    content_b64 = data.get('content_b64')
    is_private_store = data.get('is_private_store', False)
    is_public_share = data.get('is_public_share', False)
    
    if not file_name or not content_b64:
        return jsonify({"status": "error", "message": "Nom de fichier et contenu requis"}), 400
        
    result = cloud_core.upload_file(vm_name, file_name, content_b64, is_private_store, is_public_share)
    if result['status'] == 'success':
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@app.route('/api/vm/<vm_name>/files/<file_name>', methods=['GET'])
def download_vm_file(vm_name, file_name):
    """Télécharge un fichier du répertoire privé d'une VM"""
    try:
        vm_folder = f"vm_{vm_name}"
        return send_from_directory(vm_folder, file_name, as_attachment=True)
    except Exception as e:
        return jsonify({"status": "error", "message": "Fichier privé non trouvé ou accès refusé."}), 404

@app.route('/api/file/request/<file_name>', methods=['GET'])
def request_file(file_name):
    """Vérifie si un fichier est disponible publiquement."""
    file_path = os.path.join(PUBLIC_SHARE_FOLDER, file_name)
    if os.path.exists(file_path):
        return jsonify({"status": "success", "available": True, "download_url": f"/api/file/public/{file_name}"}), 200
    else:
        return jsonify({"status": "success", "available": False, "message": "Désolé, le fichier demandé n'existe pas."}), 404

@app.route('/api/file/public/<file_name>', methods=['GET'])
def download_public_file(file_name):
    """Télécharge un fichier du répertoire public (sans authentification spécifique)"""
    try:
        return send_from_directory(PUBLIC_SHARE_FOLDER, file_name, as_attachment=True)
    except Exception as e:
        return jsonify({"status": "error", "message": "Fichier public non trouvé."}), 404


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    print("🚀 API Nick Cloud en cours d'exécution sur http://127.0.0.1:5000")
    app.run(debug=True)