const API_BASE = 'http://127.0.0.1:5000/api';
let activeVM = null; 

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    
    const isDashboard = viewId === 'dashboard';
    document.getElementById('nav-public').classList.toggle('hidden', isDashboard);
    document.getElementById('nav-private').classList.toggle('hidden', !isDashboard);
    
    if (isDashboard) {
        fetchVMDashboardData(activeVM);
    }
}

function checkSession() {
    const storedVM = localStorage.getItem('nickCloudVM');
    if (storedVM) {
        activeVM = storedVM;
        document.getElementById('current-vm-display').textContent = `VM Connectée: ${activeVM}`;
        showView('dashboard');
    } else {
        showView('home');
    }
}

document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-vm-name').value.trim();
    const email = document.getElementById('reg-vm-email').value.trim();
    const password = document.getElementById('reg-vm-password').value;
    const storage_mb = parseInt(document.getElementById('reg-vm-storage').value) || 500;
    const message = document.getElementById('reg-message');
    
    if (!name || !email || !password) {
        message.className = "mt-4 text-sm text-red-500";
        message.textContent = "Veuillez remplir tous les champs.";
        return;
    }
 
    message.className = "mt-4 text-sm text-yellow-600 font-semibold";
    message.textContent = "⏳ Veuillez patienter s'il vous plaît... (Création de la VM en cours)";
 
    await new Promise(resolve => setTimeout(resolve, 5000)); 

    try {
        const response = await fetch(`${API_BASE}/vm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, storage_mb })
        });

        const result = await response.json();
        
        if (response.ok) {
         
            message.textContent = `✅ Compte VM "${name}" créé avec succès ! Vous pouvez maintenant vous connecter.`;
            message.classList.remove('text-yellow-600');
            message.classList.add('text-green-500');

            setTimeout(() => showView('login'), 2000); 
            
        } else {
            message.textContent = `❌ Erreur d'inscription: ${result.message}`;
            message.classList.remove('text-yellow-600');
            message.classList.add('text-red-500');
        }
    } catch (error) {
        message.textContent = `❌ Erreur de connexion à l'API.`;
        message.classList.remove('text-yellow-600');
        message.classList.add('text-red-500');
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const name = document.getElementById('login-vm-name').value.trim();
    const password = document.getElementById('login-vm-password').value;
    const message = document.getElementById('login-message');
    
    message.className = "mt-4 text-sm text-gray-500";
    message.textContent = "Vérification des identifiants...";

    if (!name || !password) {
        message.textContent = "Nom de VM et mot de passe requis.";
        message.classList.add('text-red-500');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/vm/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            message.textContent = `✅ Connexion à la VM "${name}" réussie !`;
            message.classList.add('text-green-500');
 
            activeVM = name;
            localStorage.setItem('nickCloudVM', activeVM);
            document.getElementById('current-vm-display').textContent = `VM Connectée: ${activeVM}`;
            setTimeout(() => showView('dashboard'), 1000);

        } else {
            message.textContent = `❌ Échec de la connexion: ${result.message}`;
            message.classList.add('text-red-500');
        }
    } catch (error) {
        message.textContent = `❌ Erreur de communication API.`;
        message.classList.add('text-red-500');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    activeVM = null;
    localStorage.removeItem('nickCloudVM');
    document.getElementById('login-vm-name').value = '';
    document.getElementById('login-vm-password').value = '';
    alert("Déconnexion réussie de Nick Cloud.");
    showView('home');
});

function renderStorageBar(vm) {

    const limit = vm.storage_limit; 
    const used = vm.storage_used; 
    const usage_percent = ((used / limit) * 100).toFixed(1);
    
    const limit_mb = (limit / (1024 * 1024)).toFixed(0);
    const used_mb = (used / (1024 * 1024)).toFixed(2);
    
    const progressBar = document.getElementById('storage-bar-progress');
    const textDisplay = document.getElementById('storage-bar-text');

    progressBar.style.width = `${usage_percent}%`;
    progressBar.style.backgroundColor = usage_percent > 90 ? '#EF4444' : (usage_percent > 70 ? '#F59E0B' : '#4F46E5');

    textDisplay.textContent = `${used_mb} MB / ${limit_mb} MB (${usage_percent}%)`;
}

async function fetchVMDashboardData(vmName) {
    if (!vmName) return;

    try {
        const response = await fetch(`${API_BASE}/vm/${vmName}`);
        const vm = await response.json();

        if (response.ok) {
            renderStorageBar(vm);
            renderVMFiles(vm.files);
        } else {
         
            document.getElementById('logout-btn').click();
        }
    } catch (error) {
        console.error("Erreur de récupération des données du Dashboard:", error);
    }
}

function renderVMFiles(files) {
    const list = document.getElementById('vm-files-list');
    list.innerHTML = '';

    if (files.length === 0) {
        list.innerHTML = `<li class="text-gray-500 italic">Vous n'avez encore stocké aucun fichier sur votre espace privé.</li>`;
        return;
    }

    files.forEach(file => {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-3 bg-gray-100 rounded-lg border border-gray-200";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${file}</span>
            <a href="${API_BASE}/vm/${activeVM}/files/${file}" download="${file}" 
               class="text-xs bg-nick-secondary text-white px-3 py-1 rounded hover:bg-nick-primary transition">
               Télécharger (Privé)
            </a>
        `;
        list.appendChild(li);
    });
}

document.getElementById('dashboard-upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('dashboard-file-input');
    const shareOption = document.getElementById('share-option');
    const message = document.getElementById('dashboard-upload-message');
    const file = fileInput.files[0];
    
    message.className = "mt-4 text-sm";
    
    if (!file) {
        message.textContent = "Veuillez sélectionner un fichier.";
        message.classList.add('text-red-500');
        return;
    }

    const selectedOption = shareOption.value;
    const isPrivateStore = selectedOption === 'store_only' || selectedOption === 'store_and_share';
    const isPublicShare = selectedOption === 'share_only' || selectedOption === 'store_and_share';
    
    if (!isPrivateStore && !isPublicShare) {
         message.textContent = "Veuillez sélectionner au moins une option de stockage/partage.";
         message.classList.add('text-red-500');
         return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content_b64 = btoa(new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), ''));

        message.className = "mt-4 text-sm text-yellow-600 font-semibold";
        message.textContent = `⏳ Téléchargement en cours de ${file.name}.... Veuillez patienter s'il vous plaît (5s).`;

        await new Promise(resolve => setTimeout(resolve, 5000)); 

        try {
            const response = await fetch(`${API_BASE}/vm/${activeVM}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    file_name: file.name, 
                    content_b64: content_b64,
                    is_private_store: isPrivateStore, 
                    is_public_share: isPublicShare 
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                let share_status = '';
                if (isPrivateStore && isPublicShare) { share_status = ' (Privé & Public)'; }
                else if (isPrivateStore) { share_status = ' (Privé uniquement)'; }
                else if (isPublicShare) { share_status = ' (Public uniquement)'; }
                
                message.textContent = `✅ Fichier ${file.name} stocké/partagé avec succès${share_status}.`;
                message.classList.remove('text-yellow-600');
                message.classList.add('text-green-500');
                fileInput.value = '';
                fetchVMDashboardData(activeVM);
            } else {
                message.textContent = `❌ Erreur d'Upload: ${result.message}`;
                message.classList.remove('text-yellow-600');
                message.classList.add('text-red-500');
            }
        } catch (error) {
            message.textContent = `❌ Erreur de communication API.`;
            message.classList.remove('text-yellow-600');
            message.classList.add('text-red-500');
        }
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById('request-file-btn').addEventListener('click', async () => {
    const fileName = document.getElementById('request-file-name').value.trim();
    const message = document.getElementById('request-file-message');
    
    if (!fileName) {
        message.className = "mt-4 text-sm text-red-500";
        message.textContent = "Veuillez entrer le nom du fichier à rechercher.";
        return;
    }
 
    message.className = "mt-4 text-sm text-yellow-600 font-semibold";
    message.textContent = "⏳ Veuillez patienter un instant... (Recherche en cours)";

    await new Promise(resolve => setTimeout(resolve, 5000)); 

    try {
        const response = await fetch(`${API_BASE}/file/request/${fileName}`);
        const result = await response.json();

        if (response.ok && result.available) {
            message.className = "mt-4 text-sm text-green-500";
            message.innerHTML = `✅ Le fichier <strong>${fileName}</strong> est disponible. <a href="${result.download_url}" download="${fileName}" class="underline font-bold hover:text-green-700">Cliquez ici pour télécharger</a>.`;
        } else {
            message.className = "mt-4 text-sm text-red-500";
            message.textContent = `❌ Désolé, le fichier "${fileName}" n'existe pas ou n'est pas partagé publiquement.`;
        }

    } catch (error) {
        message.className = "mt-4 text-sm text-red-500";
        message.textContent = "❌ Erreur de communication avec le cloud lors de la demande.";
    }
});

document.addEventListener('DOMContentLoaded', checkSession);