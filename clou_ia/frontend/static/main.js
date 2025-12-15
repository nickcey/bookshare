let currentVmCreationData = null;
let currentVM = { 
    name: null, 
    storage: '0MB', 
    used: '0MB', 
    files: [] 
};

function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.add('hidden');
    });
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    const isDashboard = viewId === 'dashboard';
    const navPrivate = document.getElementById('nav-private');
    const navPublic = document.getElementById('nav-public');
    
    if(navPrivate) navPrivate.classList.toggle('hidden', !isDashboard);
    if(navPublic) navPublic.classList.toggle('hidden', isDashboard);
}

function showConfirmationView(email) {
    document.getElementById('confirm-email-display').textContent = email;
    document.getElementById('confirm-code-input').value = ''; 
    document.getElementById('confirm-message').textContent = '';
    showView('confirm');
}


function updateDashboardUI() {

    const vmNameEl = document.getElementById('dashboard-vm-name');
    const storageEl = document.getElementById('dashboard-storage-info');
    const fileListEl = document.getElementById('dashboard-file-list');
    
    if (!vmNameEl || !storageEl || !fileListEl) { 
        console.error("Éléments du Dashboard (#dashboard-vm-name, etc.) manquants ou non chargés.");
        return; 
    
    if (!currentVM.name) {
        vmNameEl.textContent = 'Non Connecté';
        storageEl.textContent = 'N/A';
        fileListEl.innerHTML = '<p class="text-center text-gray-500">Veuillez vous connecter pour voir vos fichiers.</p>';
        return;
    }

    vmNameEl.textContent = currentVM.name;
    storageEl.textContent = `Utilisé: ${currentVM.used} / Total: ${currentVM.storage}`;
    
    fileListEl.innerHTML = '';
    if (currentVM.files.length === 0) {
        fileListEl.innerHTML = '<p class="text-center text-gray-500">Aucun fichier trouvé sur votre VM.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'space-y-2';
        currentVM.files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-3 bg-gray-100 rounded-lg shadow-sm';
            li.innerHTML = `
                <span class="font-medium text-nick-dark">${file.name}</span>
                <span class="text-sm text-gray-500">${file.size} - Partagé: ${file.shared ? 'Oui' : 'Non'}</span>
            `;
            ul.appendChild(li);
        });
        fileListEl.appendChild(ul);
    }
}

function setupEventListeners() {

    document.getElementById('logout-btn').addEventListener('click', () => {
        currentVM = { name: null, storage: '0MB', used: '0MB', files: [] };
        showView('home');
        document.getElementById('current-vm-display').textContent = '';
    });

    document.getElementById('register-btn').addEventListener('click', async () => {
        const vmName = document.getElementById('reg-vm-name').value;
        const vmEmail = document.getElementById('reg-vm-email').value;
        const vmPassword = document.getElementById('reg-vm-password').value;
        let vmStorage = document.getElementById('reg-vm-storage').value;
        const regMessage = document.getElementById('reg-message');

        regMessage.textContent = '';
   
        if (/^\d+$/.test(vmStorage) && vmStorage.length > 0) {
            vmStorage = vmStorage + 'MB';
        }
        
        if (!vmName || !vmEmail || !vmPassword || vmPassword.length < 8 || !vmStorage) {
            regMessage.className = 'text-red-500';
            regMessage.textContent = 'Veuillez remplir tous les champs (Nom VM, Email, Mot de passe (min 8), et Stockage).';
            return;
        }
        
        currentVmCreationData = { vmName, vmEmail, vmPassword, vmStorage };

        regMessage.className = 'text-center text-lg text-nick-primary font-semibold';
        regMessage.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-nick-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Envoi du code de confirmation par mail...`;

        try {
            const response = await fetch('/send_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentVmCreationData) 
            });
            const data = await response.json();

            regMessage.innerHTML = '';
            
            if (data.success) {
                showConfirmationView(vmEmail);
            } else {
                regMessage.className = 'text-red-500';
                regMessage.textContent = data.message || "Échec de l'envoi du code. Vérifiez la configuration SMTP.";
            }
        } catch (error) {
            regMessage.className = 'text-red-500';
            regMessage.textContent = "Erreur de connexion au serveur.";
        }
    });

    document.getElementById('confirm-code-btn').addEventListener('click', async () => {
        const enteredCode = document.getElementById('confirm-code-input').value;
        const confirmMessage = document.getElementById('confirm-message');

        if (!enteredCode) {
            confirmMessage.className = 'text-red-500';
            confirmMessage.textContent = 'Veuillez entrer le code de confirmation.';
            return;
        }
        
        confirmMessage.className = 'text-center text-lg text-green-500 font-semibold';
        confirmMessage.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Confirmation en cours...`;

        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        try {
            const payload = {
                ...currentVmCreationData,
                enteredCode: enteredCode 
            };

            const response = await fetch('/register_vm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                confirmMessage.className = 'text-green-500';
                confirmMessage.textContent = '✅ Compte créé avec succès ! Redirection vers la connexion.';
                currentVmCreationData = null; 
                
                setTimeout(() => {
                    showView('login');
                }, 1500);
            } else {
                confirmMessage.className = 'text-red-500';
                confirmMessage.textContent = data.message || "Erreur lors de la création de la VM."; 
            }
        } catch (error) {
            confirmMessage.className = 'text-red-500';
            confirmMessage.textContent = "Erreur de connexion lors de la création de la VM.";
        }
    });

    document.getElementById('login-btn').addEventListener('click', async () => {
        const loginVmName = document.getElementById('login-vm-name').value;
        const loginPassword = document.getElementById('login-vm-password').value;
        const loginMessage = document.getElementById('login-message');
        
        loginMessage.textContent = '';
        
        if (!loginVmName || !loginPassword) {
            loginMessage.className = 'text-red-500';
            loginMessage.textContent = 'Veuillez entrer le nom de la VM et le mot de passe.';
            return;
        }
        
        loginMessage.className = 'text-center text-lg text-green-500 font-semibold';
        loginMessage.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Connexion au serveur cloud...`;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vmName: loginVmName, password: loginPassword })
            });

            const responseText = await response.text();
            console.log("Réponse serveur brute (texte):", responseText);

            let data = {};
            try {
                data = JSON.parse(responseText); 
                console.log("Réponse API (Objet JSON):", data); 
            } catch (e) {
                 console.error("Erreur de PARSE JSON. Le serveur a renvoyé un JSON invalide ou du HTML d'erreur.", e);
                 loginMessage.className = 'text-red-500';
                 loginMessage.textContent = "Erreur interne: Le serveur n'a pas renvoyé le format attendu. Vérifiez la console Python.";
                 return;
            }
            
            if (data.success) {
                currentVM.name = data.vm_name;
                currentVM.storage = data.storage; 
                currentVM.used = '0MB'; 
                currentVM.files = []; 
                
                document.getElementById('current-vm-display').textContent = `VM: ${data.vm_name}`;
                updateDashboardUI();
                showView('dashboard');
            } else {
                loginMessage.className = 'text-red-500';
                loginMessage.textContent = data.message || "Échec de la connexion. Vérifiez le nom et le mot de passe.";
            }
                
        } catch (error) {
            console.error("Erreur de communication du réseau:", error);
            loginMessage.className = 'text-red-500';
            loginMessage.textContent = "Erreur de connexion au serveur.";
        }
    });

    document.getElementById('upload-btn').addEventListener('click', async () => {
        const uploadMessage = document.getElementById('upload-message');
        const filename = document.getElementById('upload-filename').value;
        
        if (!filename) {
            uploadMessage.className = 'text-red-500';
            uploadMessage.textContent = 'Veuillez spécifier le nom du fichier.';
            return;
        }
        
        uploadMessage.className = 'text-center text-lg text-yellow-500 font-semibold';
        uploadMessage.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Simulation d'upload et d'annonce au Cloud (7s)...`;

        try {
            await new Promise(resolve => setTimeout(resolve, 7000)); 
            
            const newFileSize = `${Math.floor(Math.random() * 50) + 1}KB`;
            currentVM.files.push({ name: filename, size: newFileSize, shared: true });
            currentVM.used = `+${newFileSize}`; 
            
            uploadMessage.className = 'text-green-500';
            uploadMessage.textContent = `✅ Fichier '${filename}' créé et annoncé au Cloud.`;
            
            updateDashboardUI();

        } catch (error) {
            uploadMessage.className = 'text-red-500';
            uploadMessage.textContent = "Erreur lors de l'upload simulé.";
        }
    });

    document.getElementById('request-btn').addEventListener('click', async () => {
        const requestMessage = document.getElementById('request-message');
        const filename = document.getElementById('request-filename').value;
        
        if (!filename) {
            requestMessage.className = 'text-red-500';
            requestMessage.textContent = 'Veuillez spécifier le nom du fichier à demander.';
            return;
        }
        
        requestMessage.className = 'text-center text-lg text-yellow-500 font-semibold';
        requestMessage.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 inline text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Recherche et transfert de fichier depuis une autre VM (7s)...`;

        try {
            await new Promise(resolve => setTimeout(resolve, 7000)); 
            
            const newFileSize = `${Math.floor(Math.random() * 80) + 20}KB`;
            currentVM.files.push({ name: `[DL]_${filename}`, size: newFileSize, shared: false });
            currentVM.used = `+${newFileSize}`; 

            requestMessage.className = 'text-green-500';
            requestMessage.textContent = `✅ Fichier '${filename}' reçu et enregistré sur votre VM.`;
            
            updateDashboardUI();

        } catch (error) {
            requestMessage.className = 'text-red-500';
            requestMessage.textContent = "Erreur: Fichier non trouvé ou erreur de transfert simulé.";
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
   
    showView('home'); 
    
    setupEventListeners();
   
    updateDashboardUI(); 
});