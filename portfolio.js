const choixPhoto = document.querySelector('#fichier-photo');
const photo = document.querySelector('#photo-profil');
const message = document.querySelector('#message-photo');
const clePhoto = 'portfolio-sio-photo';
const retirerPhoto = document.querySelector('#retirer-photo');
let versionPhoto = 0;

function afficherPhoto(source) {
  photo.src = source;
  photo.hidden = false;
  retirerPhoto.hidden = false;
}

// Le navigateur conserve la photo sur cet appareil.
try {
  const photoMemoire = localStorage.getItem(clePhoto);
  if (photoMemoire) afficherPhoto(photoMemoire);
} catch {
  message.textContent = 'Le stockage local est indisponible.';
}

retirerPhoto.addEventListener('click', () => {
  versionPhoto++;
  photo.hidden = true;
  photo.removeAttribute('src');
  choixPhoto.value = '';
  retirerPhoto.hidden = true;
  choixPhoto.focus();

  try {
    localStorage.removeItem(clePhoto);
    message.textContent = 'Photo de profil retirée.';
  } catch {
    message.textContent = 'Photo masquée. Impossible de supprimer la copie enregistrée.';
  }
});

choixPhoto.addEventListener('change', () => {
  const fichier = choixPhoto.files[0];
  if (!fichier) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type) ||
      fichier.size > 2 * 1024 * 1024) {
    message.textContent = 'Choisis une image JPG, PNG ou WebP de 2 Mo maximum.';
    choixPhoto.value = '';
    return;
  }

  const version = ++versionPhoto;
  const lecteur = new FileReader();
  lecteur.addEventListener('load', () => {
    const apercu = new Image();
    apercu.addEventListener('load', () => {
      if (version !== versionPhoto) return;
      afficherPhoto(lecteur.result);
      try {
        localStorage.setItem(clePhoto, lecteur.result);
        message.textContent = 'Photo enregistrée dans ce navigateur.';
      } catch {
        message.textContent = 'Photo affichée pour cette visite.';
      }
    });
    apercu.addEventListener('error', () => {
      if (version !== versionPhoto) return;
      message.textContent = 'Cette image ne peut pas être affichée.';
    });
    apercu.src = lecteur.result;
  });
  lecteur.addEventListener('error', () => {
    if (version !== versionPhoto) return;
    message.textContent = 'Impossible de lire cette image.';
  });
  lecteur.readAsDataURL(fichier);
});


// Les pièces jointes restent dans le stockage de ce navigateur.
const projets = document.querySelectorAll('[data-projet]');

const baseProjets = new Promise((resolve, reject) => {
  const ouverture = indexedDB.open('portfolio-projets', 1);

  ouverture.onupgradeneeded = () => {
    const fichiers = ouverture.result.createObjectStore('fichiers', {
      autoIncrement: true
    });
    fichiers.createIndex('projet', 'projet');
  };
  ouverture.onsuccess = () => resolve(ouverture.result);
  ouverture.onerror = () => reject(ouverture.error);
});

function ajouterLien(liste, fichier) {
  const ligne = document.createElement('li');
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(fichier);
  lien.download = fichier.name;
  lien.textContent = fichier.name;
  ligne.append(lien);
  liste.append(ligne);
}

for (const projet of projets) {
  const champ = projet.querySelector('input');
  const liste = projet.querySelector('ul');
  const statut = projet.querySelector('[role="status"]');
  const identifiant = projet.dataset.projet;

  // Attend la fin du chargement avant d'accepter de nouveaux fichiers.
  baseProjets.then((base) => {
    const lecture = base.transaction('fichiers').objectStore('fichiers')
      .index('projet').openCursor(identifiant);

    lecture.onsuccess = () => {
      const entree = lecture.result;
      if (entree) {
        ajouterLien(liste, entree.value.fichier);
        entree.continue();
      } else {
        statut.textContent = liste.children.length ? '' : 'Aucun fichier ajouté.';
        champ.disabled = false;
      }
    };
    lecture.onerror = () => {
      statut.textContent = 'Impossible de charger les fichiers de ce projet.';
    };
  }).catch(() => {
    statut.textContent = 'Le stockage de fichiers est indisponible dans ce navigateur.';
  });

  champ.addEventListener('change', async () => {
    const selection = Array.from(champ.files);
    if (!selection.length) return;

    champ.value = '';
    champ.disabled = true;
    statut.textContent = 'Enregistrement…';

    try {
      const base = await baseProjets;
      await new Promise((resolve, reject) => {
        const transaction = base.transaction('fichiers', 'readwrite');
        const stockage = transaction.objectStore('fichiers');
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error);
        for (const fichier of selection) {
          stockage.add({ projet: identifiant, fichier });
        }
      });

      for (const fichier of selection) ajouterLien(liste, fichier);
      statut.textContent = selection.length === 1
        ? 'Fichier ajouté.'
        : selection.length + ' fichiers ajoutés.';
    } catch {
      statut.textContent = 'Enregistrement impossible. Vérifie l’espace disponible dans le navigateur.';
    } finally {
      champ.disabled = false;
    }
  });
}


// Choisit un exemple de code différent pour chaque côté au chargement.
const exemplesCode = [
  'const projet = "SLAM";',
  'SELECT * FROM projets;',
  '.carte { display: grid; }',
  'git commit -m "Nouveau projet"',
  'console.log("Bonjour !");',
  'npm run dev'
];

const lignesDecoratives = document.querySelectorAll('[data-code-deco]');
for (const ligne of lignesDecoratives) {
  const index = Math.floor(Math.random() * exemplesCode.length);
  ligne.textContent = exemplesCode.splice(index, 1)[0];
}
