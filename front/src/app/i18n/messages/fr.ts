/**
 * Textes de l'interface en français — la référence : les autres langues
 * doivent avoir exactement les mêmes clés (voir ../index.ts).
 *
 * Les `{nom}` sont remplacés par `fmt()`.
 */

export const fr = {
  meta: {
    title: "IA-DAF — Assistant pour vos démarches administratives",
    description:
      "Assistant IA multilingue qui simplifie vos démarches administratives françaises : titre de séjour, CAF, CPAM, impôts et plus encore.",
  },

  common: {
    loading: "Chargement…",
    retry: "Réessayer",
    cancel: "Annuler",
    save: "Enregistrer",
    close: "Fermer",
    send: "Envoyer",
    back: "Retour",
    access: "Accéder",
    or: "ou",
    networkError: "Une erreur réseau est survenue. Réessayez.",
    oneTimePayment: "paiement unique",
    closeNotification: "Fermer la notification",
  },

  legal: {
    legalNotice: "Mentions légales",
    privacy: "Politique de confidentialité",
    terms: "Conditions générales de vente",
    frenchOnly:
      "Ce document n’existe qu’en français : c’est la version française qui fait foi.",
  },

  unsubscribe: {
    title: "Désinscription",
    subtitle: "Ne plus recevoir d’e-mails d’IA-DAF.",
    incomplete:
      "Ce lien de désinscription est incomplet. Utilisez le lien présent en bas de l’e-mail reçu.",
    done: "C’est fait : votre adresse a été supprimée et vous ne recevrez plus d’e-mails de notre part.",
    explain: "Votre adresse e-mail sera définitivement supprimée de notre liste de contacts.",
    submit: "Me désinscrire",
    pending: "Désinscription…",
    backHome: "Retour à l’accueil",
  },

  lang: {
    choose: "Choisir la langue",
    label: "Langue",
  },

  /** Erreurs renvoyées par les routes d'API, et clés des schémas zod. */
  errors: {
    authRequired: "Authentification requise.",
    invalidBody: "Corps de requête invalide.",
    invalidData: "Données invalides.",
    invalidForm: "Formulaire invalide.",
    genericError: "Une erreur est survenue. Réessayez plus tard.",
    rateLimited: "Trop de requêtes. Réessayez dans quelques minutes.",
    accountNotFound: "Compte introuvable.",
    documentNotFound: "Pièce introuvable.",
    invalidDocumentType: "Type de pièce invalide.",
    unknownDocumentForPack: "Pièce inconnue pour ce pack.",
    unknownPack: "Pack inconnu.",
    packNotOwned: "Ce pack ne fait pas partie de vos achats.",
    noFile: "Aucun fichier reçu.",
    fileTooLarge: "Fichier trop volumineux (10 Mo maximum).",
    uploadFailed: "Le dépôt a échoué. Réessayez.",
    deleteFailed: "La suppression a échoué.",
    checkFailed: "La vérification a échoué.",
    precheckClosed: "La vérification automatique des pièces n’est pas encore ouverte.",
    invalidDispute: "Signalement invalide.",
    disputeNotSaved: "Signalement non enregistré.",
    wrongCurrentPassword: "Mot de passe actuel incorrect.",
    externalAccountNoPassword:
      "Ce compte se connecte via un fournisseur externe et n’a pas de mot de passe.",
    passwordChangeFailed: "Impossible de modifier le mot de passe.",
    sessionsCloseFailed: "Impossible de fermer les sessions.",
    emailMismatch: "L’adresse saisie ne correspond pas à votre compte.",
    accountDeleteFailed:
      "Impossible de supprimer le compte pour le moment. Réessayez dans un instant.",
    registerFailed: "Impossible de créer ce compte. Essayez de vous connecter.",
    profileLoadFailed: "Impossible de charger votre profil.",
    purchasesLoadFailed: "Impossible de charger vos achats.",
    entitlementsFailed: "Impossible de récupérer vos accès.",
    saveFailed: "Impossible d’enregistrer les modifications.",
    leadSaveFailed: "Impossible d’enregistrer l’adresse.",
    invalidUnsubscribeLink: "Lien de désinscription invalide.",
    unsubscribeFailed: "La désinscription a échoué. Réessayez.",
    paymentNotConfigured: "Le paiement n’est pas configuré sur ce serveur.",
    checkoutFailed: "Impossible d’ouvrir le paiement. Réessayez plus tard.",
    checkoutConsentRequired:
      "Cochez la case de demande d’accès immédiat pour poursuivre le paiement.",
    resetLinkExpired:
      "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis la page de connexion.",
    invalidResetLink: "Lien de réinitialisation invalide.",
    // Schémas de validation (lib/validation.ts)
    passwordMin: "Le mot de passe doit contenir au moins 8 caractères.",
    passwordMax: "Le mot de passe est trop long.",
    passwordLetter: "Le mot de passe doit contenir au moins une lettre.",
    passwordDigit: "Le mot de passe doit contenir au moins un chiffre.",
    nameMin: "Le nom doit contenir au moins 2 caractères.",
    nameMax: "Le nom est trop long.",
    emailInvalid: "Adresse e-mail invalide.",
    emailTooLong: "L’adresse e-mail est trop longue.",
    currentPasswordRequired: "Saisissez votre mot de passe actuel.",
    newPasswordSame: "Le nouveau mot de passe doit être différent de l’ancien.",
  },

  /** E-mails envoyés au visiteur, dans la langue de la page d'où il les demande. */
  email: {
    hello: "Bonjour,",
    helloName: "Bonjour {name},",
    resetSubject: "Réinitialisation de votre mot de passe IA-DAF",
    resetIntro: "Vous avez demandé à réinitialiser le mot de passe de votre compte IA-DAF.",
    resetValidity: "Ce lien est valable {minutes} minutes et ne fonctionne qu’une fois :",
    resetIgnore:
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste inchangé.",
    signature: "— L’équipe IA-DAF",
  },

  brand: {
    tagline: "Assistant administratif",
  },

  nav: {
    label: "Navigation principale",
    menu: "Menu",
    home: "Accueil",
    packs: "Nos packs",
    procedures: "Démarches",
    folders: "Mes Dossiers",
    documents: "Documents",
    dashboard: "Tableau de bord",
    settings: "Paramètres",
    signIn: "Se connecter",
    signOut: "Déconnexion",
    myAccount: "Mon compte",
    expand: "Déplier la navigation",
    collapse: "Replier la navigation",
    expandShort: "Déplier",
    collapseShort: "Replier",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },

  footer: {
    about:
      "Votre assistant pour réussir vos démarches administratives en France, dans votre langue, à toute heure.",
    navigation: "Navigation",
    packs: "Nos packs",
    contact: "Contact",
    allContacts: "Toutes nos coordonnées →",
    rights: "© {year} IA-DAF. Tous droits réservés.",
    legalNotice: "Mentions légales",
    privacy: "Confidentialité",
    terms: "CGV",
  },

  /** Chat d'accueil (bulle flottante), en tutoiement comme à l'origine. */
  chat: {
    open: "Ouvrir le chat",
    close: "Fermer le chat",
    placeholder: "Pose ta question…",
    emailPlaceholder: "ton.email@exemple.com",
    emailPrompt: "Facultatif — tu peux passer cette étape",
    emailAsk:
      "📧 Si tu le souhaites, laisse-moi ton adresse e-mail pour recevoir nos conseils et nos offres sur les démarches. C'est facultatif : tu peux aussi passer et poser directement ta question.",
    emailSuccess: "Merci ! 🎉 Ton e-mail a bien été enregistré. Comment puis-je t'aider ?",
    emailInvalid:
      "Hmm, ça ne ressemble pas à une adresse e-mail valide. 🤔 Peux-tu réessayer ? (ex: ton.email@exemple.com)",
    emailConsent:
      "J'accepte de recevoir par e-mail les conseils et offres d'IA-DAF. Adresse conservée 3 ans maximum, désinscription possible à tout moment.",
    emailSkip: "Passer",
    emailSkipped: "Pas de souci ! Comment puis-je t'aider ?",
    emailError:
      "Ton e-mail n'a pas pu être enregistré, mais on peut continuer. Comment puis-je t'aider ?",
    error: "Désolé, une erreur est survenue. Veuillez réessayer.",
    rateLimited: "Beaucoup de questions en peu de temps ! Réessaie dans quelques minutes.",
    interrupted: "Réponse interrompue — renvoie ta question pour la suite.",
    loading: "Réponse en cours…",
    online: "En ligne",
    assistant: "Assistant IA-DAF",
    discoverPacks: "🎯 Découvrir nos packs →",
    fallbackEnd:
      "Bonne question ! Pour un accompagnement complet et personnalisé, je t'invite à jeter un œil à nos packs — ils sont faits pour ça 😉",
    fallbackWelcome:
      "Bonjour ! 👋 Bienvenue sur IA-DAF, ta plateforme d'aide aux démarches administratives françaises. Comment puis-je t'aider ?",
  },

  /** Page « Assistant IA » (connecté). */
  assistantPage: {
    title: "Assistant IA",
    subtitle: "Posez vos questions sur les démarches administratives",
    welcome:
      "Bonjour ! Je suis votre assistant IA. Je peux vous aider pour vos démarches administratives. Que souhaitez-vous faire aujourd’hui ?",
    suggestionsTitle: "Suggestions",
    suggestions: [
      "Comment obtenir une carte Vitale ?",
      "Inscription à France Travail",
      "Demande d’allocations CAF",
      "Renouvellement titre de séjour",
    ],
    placeholder: "Posez votre question sur une démarche administrative…",
    interrupted: "Réponse interrompue — renvoyez votre question pour la suite.",
    rateLimited: "Vous avez envoyé beaucoup de messages. Réessayez dans quelques minutes.",
  },

  /** Assistant d'un pack. */
  packChat: {
    placeholder: "Posez votre question...",
    loading: "L'IA génère votre réponse…",
    assistant: "Assistant IA",
    online: "En ligne",
    error: "Désolé, une erreur est survenue. Veuillez réessayer.",
  },

  auth: {
    email: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    password: "Mot de passe",
    passwordRule: "8 caractères minimum, avec au moins une lettre et un chiffre.",
    google: "Continuer avec Google",
    backToLogin: "Retour à la connexion",
    aside: {
      titleStart: "Vos démarches,",
      titleEnd: "dans votre langue.",
      text: "Un espace pour comprendre, préparer et réussir vos démarches administratives en France.",
      languages: "Un assistant en {count} langues : {list}",
      sourced: "Des réponses appuyées sur les fiches de service-public.gouv.fr",
      checked: "Vos pièces vérifiées avant le dépôt de votre dossier",
      privacy: "Pièces chiffrées, compte supprimable à tout moment",
    },
    login: {
      title: "Connexion",
      subtitle: "Accédez à votre espace et suivez vos démarches.",
      forgot: "Mot de passe oublié ?",
      submit: "Se connecter",
      submitting: "Connexion…",
      tooManyAttempts: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
      wrongCredentials: "E-mail ou mot de passe incorrect.",
      noAccount: "Pas encore de compte ?",
      createAccount: "Créer un compte",
      tip: "Vous pouvez créer un compte même si vous ne parlez pas bien français. IA-DAF vous accompagne étape par étape.",
      notices: {
        passwordChanged:
          "Mot de passe modifié. Vos sessions ont été fermées sur tous vos appareils : reconnectez-vous avec le nouveau.",
        signedOutEverywhere: "Vous avez été déconnecté de tous vos appareils.",
      },
    },
    register: {
      title: "Créer un compte",
      subtitle: "Gratuit — commencez vos démarches en quelques minutes.",
      name: "Nom complet",
      namePlaceholder: "Amina Diallo",
      submit: "Créer mon compte",
      submitting: "Création…",
      failed: "Impossible de créer le compte.",
      haveAccount: "Déjà un compte ?",
      signIn: "Se connecter",
    },
    forgot: {
      title: "Mot de passe oublié",
      subtitle:
        "Indiquez l’adresse de votre compte : nous vous envoyons un lien pour en choisir un nouveau.",
      submit: "Recevoir le lien",
      submitting: "Envoi…",
      failed: "Impossible d’envoyer l’e-mail. Réessayez.",
      genericSent:
        "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.",
      checkSpam: "Pensez à vérifier vos courriers indésirables. Le lien est valable 30 minutes.",
    },
    reset: {
      title: "Nouveau mot de passe",
      subtitle: "Choisissez le mot de passe de votre compte.",
      newPassword: "Nouveau mot de passe",
      confirm: "Confirmez le mot de passe",
      submitting: "Enregistrement…",
      mismatch: "Les deux mots de passe ne correspondent pas.",
      failed: "Impossible de changer le mot de passe.",
      incompleteTitle: "Lien incomplet",
      incompleteSubtitle: "Ce lien de réinitialisation est invalide.",
      incompleteText: "Utilisez le lien complet reçu par e-mail, ou demandez-en un nouveau.",
      newLink: "Demander un nouveau lien",
      doneTitle: "Mot de passe modifié",
      doneSubtitle: "Vous pouvez maintenant vous connecter.",
      doneText: "Votre nouveau mot de passe est enregistré.",
    },
  },

  home: {
    badge: "Assistant IA · en {count} langues",
    titleStart: "Vos démarches en France,",
    titleHighlight: "enfin simples.",
    intro:
      "IA-DAF répond à vos questions dans votre langue, s’appuie sur les fiches officielles de service-public.gouv.fr et vérifie vos pièces avant que vous ne déposiez votre dossier.",
    ctaStart: "Commencer maintenant",
    ctaExplore: "Explorer les démarches",
    trust: ["Réponses sourcées", "Pièces chiffrées", "Compte gratuit"],
    preview: {
      label: "Exemple de conversation avec l’assistant",
      assistant: "Assistant IA-DAF",
      online: "En ligne",
      question: "Comment renouveler mon titre de séjour ?",
      answer:
        "Faites la demande en ligne sur le site de l’ANEF, avant l’expiration de votre titre. Il vous faudra :",
      items: [
        "Votre passeport",
        "Un justificatif de domicile récent",
        "Une photo d’identité numérique",
      ],
      source: "Source : service-public.gouv.fr",
      verified: "Pièce vérifiée",
      verifiedDetail: "Date de validité contrôlée",
      encrypted: "Pièces chiffrées",
    },
    administrations: "Les administrations que vous croisez, réunies au même endroit",
    facts: {
      languages: "Langues",
      guided: "Démarches guidées",
      available: "Assistant disponible",
      availableValue: "24 h/24",
      availableDetail: "Même le soir et le week-end",
      encrypted: "Pièces chiffrées",
      encryptedDetail: "Supprimables à tout moment",
    },
    features: {
      heading: {
        eyebrow: "Pourquoi IA-DAF",
        title: "Tout ce qu’il faut pour un dossier complet",
        description: "Une seule plateforme, de la première question jusqu’au dépôt.",
      },
      languageTitle: "Un assistant qui parle votre langue",
      languageText:
        "Posez vos questions comme vous les formuleriez à un proche : l’assistant vous répond clairement, dans la langue que vous choisissez, à toute heure.",
      items: {
        sourced: {
          title: "Des réponses sourcées",
          description:
            "L’assistant s’appuie sur les fiches officielles de service-public.gouv.fr, synchronisées automatiquement.",
        },
        checked: {
          title: "Vos pièces vérifiées",
          description:
            "Date de validité, lisibilité, IBAN : IA-DAF repère ce qui ferait refuser votre dossier, avant le dépôt.",
        },
        checklist: {
          title: "Une checklist par démarche",
          description:
            "Les pièces à fournir selon votre situation, cochées au fur et à mesure de votre avancée.",
        },
        privacy: {
          title: "Vos données protégées",
          description:
            "Pièces chiffrées, compte et données supprimables à tout moment depuis vos paramètres.",
        },
      },
    },
    steps: {
      heading: {
        eyebrow: "Comment ça marche",
        title: "Quatre étapes, aucune impasse",
        description: "Vous savez toujours ce qu’il reste à faire.",
      },
      items: [
        {
          title: "Créez votre compte",
          description: "Gratuit, en deux minutes. Choisissez votre langue.",
        },
        {
          title: "Posez vos questions",
          description: "Expliquez votre situation : l’assistant vous dit quelles démarches faire.",
        },
        {
          title: "Préparez vos pièces",
          description: "Déposez-les dans votre espace : IA-DAF les vérifie une à une.",
        },
        {
          title: "Déposez un dossier complet",
          description: "Sans pièce oubliée ni document périmé : moins de risques de refus.",
        },
      ],
    },
    profiles: {
      heading: {
        eyebrow: "Pour qui",
        title: "IA-DAF pour tous les profils",
        description: "Des parcours adaptés à votre situation personnelle.",
      },
      stepsLabel: "Démarches concernées",
      seePacks: "Voir les packs",
      items: {
        student: {
          title: "Étudiant étranger",
          description:
            "Vous venez étudier en France ? Nous vous accompagnons dans toutes vos démarches administratives.",
          steps: ["Carte Vitale", "CAF logement", "Titre de séjour"],
        },
        parent: {
          title: "Nouveau parent",
          description:
            "L'arrivée d'un enfant implique de nombreuses démarches. Simplifiez-vous la vie avec notre assistant dédié.",
          steps: ["Allocations CAF", "Déclaration de naissance", "Congé parental"],
        },
        worker: {
          title: "Nouveau travailleur",
          description:
            "Vous commencez un emploi en France ? Nous vous guidons pour toutes les formalités professionnelles.",
          steps: ["URSSAF", "France Travail", "Mutuelle"],
        },
        newcomer: {
          title: "Primo-arrivant",
          description:
            "Vous venez d'arriver en France ? Découvrez toutes les démarches essentielles pour bien vous installer.",
          steps: ["Préfecture", "Banque", "Logement", "Santé"],
        },
      },
    },
    cta: {
      title: "Prêt à avancer sur votre dossier ?",
      text: "Créez votre compte gratuitement et posez votre première question dès maintenant.",
      register: "Créer mon compte",
      packs: "Voir les packs",
    },
    /** À la place de l'appel final, pour un visiteur déjà connecté. */
    welcomeBack: {
      badge: "Vous êtes connecté",
      title: "Bon retour, {name} !",
      titleNoName: "Bon retour !",
      text: "Reprenez vos démarches là où vous les avez laissées.",
      dashboard: "Vos packs, vos achats et vos dossiers en un coup d’œil.",
      folders: "Suivez l’avancement de chacune de vos démarches.",
      assistant: "Posez une nouvelle question, dans votre langue.",
    },
  },

  dashboard: {
    title: "Tableau de bord",
    hello: "Bonjour {name}",
    subtitle: "Vue d’ensemble de vos packs, démarches et documents.",
    packsAvailable: "Packs accessibles",
    packsOutOf: "sur {count} disponibles",
    purchases: "Achats",
    totalSpent: "{amount} au total",
    noPurchase: "Aucun achat",
    openFolders: "Dossiers en cours",
    foldersUnavailable: "Suivi momentanément indisponible",
    averageProgress: "{percent} % des pièces réunies en moyenne",
    noFolder: "Aucun dossier ouvert",
    quickActions: "Actions rapides",
    quickActionsText: "Les points d’entrée les plus utilisés.",
    chat: "Discuter avec l’IA",
    chatText: "Posez vos questions administratives à l’assistant.",
    documents: "Mes documents",
    documentsText: "Retrouvez les pièces déposées dans vos packs.",
    procedures: "Explorer les démarches",
    proceduresText: "Trouvez la démarche adaptée à votre situation.",
    myPacks: "Mes packs",
    myPacksText: "Les accompagnements auxquels vous avez accès.",
    catalog: "Voir le catalogue",
    noPackTitle: "Aucun pack pour le moment",
    noPackText: "Choisissez un pack pour être accompagné pas à pas dans votre démarche.",
    discoverPacks: "Découvrir les packs",
  },

  folders: {
    title: "Mes Dossiers",
    subtitle: "Suivez l’avancement de toutes vos démarches en cours.",
    start: "Démarrer une démarche",
    loadError: "Impossible de charger vos dossiers pour le moment. Réessayez dans quelques instants.",
    emptyTitle: "Vous n’avez pas encore de dossier",
    emptyText:
      "Un dossier est créé pour chaque pack que vous achetez : il réunit la liste des pièces et le suivi de votre démarche.",
    total: "Total",
    overdue: "En retard",
    done: "Terminés",
    yours: "Vos dossiers",
    filterText: "Filtrez par état d’avancement.",
    all: "Tous",
    status: {
      EN_ATTENTE: "En préparation",
      EN_COURS: "En cours",
      TERMINEE: "Terminé",
      ANNULEE: "Annulé",
    },
    noneTitle: "Aucun dossier dans cet état",
    noneText: "Changez de filtre pour voir vos autres dossiers.",
    seeAll: "Voir tous les dossiers",
    gathered: "{done}/{total} pièces réunies",
    progress: "Progression",
    progressOf: "Progression du dossier {title}",
    openPack: "Ouvrir l’espace du pack",
  },

  documents: {
    title: "Mes documents",
    subtitle: "Les pièces que vous avez déposées, pack par pack.",
    emptyText:
      "Les pièces se déposent dans l’espace d’un pack, à côté de la liste de celles que la démarche demande.",
    retention:
      "Vos pièces sont chiffrées et conservées {days} jours au plus. Leur dépôt ne vaut pas vérification : seule l’administration décide de la conformité d’un dossier.",
    filed: "Pièces déposées : {count}",
    required: "demandées : {count}",
    manage: "Gérer dans l’espace du pack",
    loadError: "Les pièces de ce pack n’ont pas pu être chargées. Réessayez dans un instant.",
    none: "Aucune pièce déposée.",
    sizeKb: "{size} Ko",
    sizeMb: "{size} Mo",
  },

  /** Espace d'un pack acheté : pièces à déposer et assistant dédié. */
  workspace: {
    notFoundTitle: "Pack introuvable",
    notFoundText: "Le pack demandé n’existe pas ou n’est plus disponible.",
    backToPacks: "Retour aux packs",
    yourDocuments: "Vos documents",
    yourDocumentsText: "Ajoutez les pièces demandées pour votre démarche.",
    documentsCount: "{done}/{total} documents",
    filedLabel: "Documents déposés",
    download: "Télécharger",
    formats: "PDF, JPG, PNG · 10 Mo max.",
    sizeMb: "{size} Mo",
    removeFile: "Retirer le fichier",
    browse: "Parcourir",
    dropzone: "Glissez d’autres fichiers ici ou cliquez pour ajouter",
    loadError:
      "Vos pièces déjà déposées n’ont pas pu être chargées. Rechargez la page dans un instant avant d’en déposer de nouvelles.",
    retention:
      "Vos pièces sont chiffrées et conservées {days} jours au plus. Vous pouvez les retirer à tout moment.",
    check: "Vérifier mon dossier",
    checking: "Vérification en cours…",
    precheckClosed:
      "La vérification automatique des pièces n’est pas encore ouverte : l’assistant contrôle pour l’instant la complétude de votre dossier.",
    precheckDisclaimer:
      "Pré-vérification indicative, sous chaque pièce : elle ne garantit pas l’acceptation de votre dossier, seule l’administration en décide.",
    checkNeedsOne: "Déposez au moins une pièce pour lancer la vérification.",
    checkExplains: "L’assistant vérifie que votre dossier est complet.",
    badType: "Type de fichier non supporté. Utilisez PDF, JPG ou PNG.",
    tooLarge: "Fichier trop volumineux. Taille maximale : 10 Mo.",
    filed: "Pièce déposée.",
    removed: "Pièce retirée.",
    analysisDone: "Analyse de votre dossier terminée.",
    analysisFailed: "L’analyse a échoué. Réessayez dans un instant.",
    toComplete: "Points à compléter :",
    recommendations: "Recommandations :",
    fallbackWelcome:
      "Bienvenue ! 🎉 Je suis là pour t'accompagner dans ta démarche **{title}**.\n\n📋 **Documents à préparer :**\n{docs}\n\nN'hésite pas à me poser tes questions, je suis là pour t'aider ! 💬",
    precheckLabel: "Pré-vérification automatique",
    reported: "— merci, c’est signalé",
    reportWrong: "résultat faux ?",
    reportRetry: "réessayer le signalement",
  },

  /** Verdicts du service IA, mêmes tournures que ai-service/app/documents. */
  precheck: {
    messages: {
      readablePdf: "Fichier PDF illisible, protégé ou endommagé : déposez-en une autre copie.",
      readableImage: "Image illisible ou endommagée : déposez-en une autre.",
      readableOk: "Fichier lisible.",
      resolutionLow:
        "Image de faible résolution : le texte risque d'être illisible pour l'administration.",
      blurred: "Image floue : reprenez la photo, appareil immobile.",
      tooDark: "Image trop sombre : reprenez la photo à la lumière du jour.",
      overexposed: "Image surexposée ou avec reflet : évitez le flash.",
      qualityOk: "Netteté, lumière et résolution correctes.",
      contentUnread:
        "Contenu non lu automatiquement (document scanné ou photo) : seule la qualité a été vérifiée.",
      mrzOk: "Bande de lecture automatique (MRZ) lue et cohérente.",
      mrzBad:
        "La bande de lecture automatique (MRZ) est mal lue ou incohérente : reprenez la photo bien à plat, sans reflet.",
      expiryUnread: "Date de fin de validité non lue : vérifiez-la vous-même.",
      expired: "Document expiré depuis le {date} : il sera refusé.",
      expiresSoon:
        "Document valable jusqu'au {date} seulement : il risque d'expirer avant la fin de la démarche.",
      validUntil: "Document valable jusqu'au {date}.",
      recencyUnread: "Date d'émission non lue : le justificatif doit dater de moins de 3 mois.",
      tooOld: "Justificatif du {date} : il doit dater de moins de 3 mois.",
      recent: "Justificatif du {date}, de moins de 3 mois.",
      ibanUnread: "IBAN non lu : vérifiez qu'il figure bien sur le RIB.",
      ibanOk: "IBAN présent et valide (clé de contrôle correcte).",
      ibanInvalid: "L'IBAN lu est invalide (clé de contrôle fausse) : vérifiez le RIB.",
    },
  },

  payment: {
    title: "Paiement",
    notFoundText: "Impossible de trouver ce pack. Retournez à la page des packs.",
    secure: "Paiement sécurisé par Stripe",
    heading: "Finalisez votre commande",
    bankDetails:
      "Vos coordonnées bancaires sont saisies directement chez Stripe et ne transitent jamais par nos serveurs.",
    selected: "Pack sélectionné",
    content: "Contenu du pack",
    summary: "Résumé de commande",
    subtotal: "Sous-total",
    fees: "Frais de service",
    included: "Inclus",
    total: "Total",
    immediate: "Accès au pack débloqué immédiatement après confirmation du paiement par Stripe.",
    waiver:
      "Je demande l’accès immédiat au pack et je reconnais perdre mon droit de rétractation de 14 jours. J’accepte les",
    terms: "conditions générales de vente",
    waiverEnd: ".",
    pay: "Payer avec Stripe",
    redirecting: "Redirection…",
    redirectNote: "Vous serez redirigé vers la page de paiement sécurisée de Stripe.",
  },

  settings: {
    title: "Paramètres",
    subtitle: "Gérez votre compte, vos préférences et vos achats.",
    navLabel: "Sections des paramètres",
    nav: {
      profile: "Profil",
      preferences: "Préférences",
      security: "Sécurité",
      purchases: "Mes achats",
      danger: "Supprimer le compte",
    },
    preferences: {
      title: "Langue d’affichage",
      description:
        "S’applique immédiatement à l’interface et à l’assistant IA. Votre choix est conservé sur cet appareil.",
    },
    profile: {
      title: "Profil",
      description: "Ces informations apparaissent dans votre espace personnel.",
      noName: "Compte sans nom",
      memberSince: "Membre depuis le {date}",
      saved: "Vos modifications ont été enregistrées.",
      updated: "Profil mis à jour.",
      emailHint: "L’adresse sert d’identifiant de connexion et ne peut pas être modifiée ici.",
      method: "Méthode de connexion",
      methodPassword: "E-mail et mot de passe",
      methodProvider: "Compte {provider}",
    },
    security: {
      title: "Sécurité",
      description: "Comment votre compte est protégé.",
      external:
        "Vous vous connectez via {provider}. Votre mot de passe est géré par ce fournisseur — il n’y a rien à modifier ici.",
      passwordDescription: "Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.",
      changed:
        "Mot de passe modifié. Vos sessions sont fermées sur tous vos appareils : reconnexion…",
      current: "Mot de passe actuel",
      show: "Afficher les mots de passe",
      hide: "Masquer les mots de passe",
      strength: "Robustesse : {level}",
      strengthLevels: ["Très faible", "Faible", "Moyen", "Bon", "Excellent"],
      change: "Modifier le mot de passe",
      changing: "Modification…",
      sessions: "Sessions",
      sessionsDescription:
        "Un téléphone perdu, un ordinateur partagé : fermez toutes les sessions ouvertes.",
      signOutEverywhere: "Se déconnecter de tous les appareils",
      signingOut: "Déconnexion…",
    },
    purchases: {
      title: "Mes achats",
      description: "Historique des packs que vous avez achetés.",
      loading: "Chargement de vos achats…",
      emptyTitle: "Aucun achat pour le moment",
      emptyText: "Les packs que vous achetez apparaîtront ici.",
      boughtOn: "Acheté le {date}",
      open: "Ouvrir",
    },
    danger: {
      title: "Supprimer le compte",
      description: "Cette action est définitive et ne peut pas être annulée.",
      whatTitle: "Ce qui sera supprimé :",
      what: [
        "Votre compte et vos informations personnelles",
        "Vos accès aux packs achetés, sans remboursement",
        "Votre historique de démarches et vos documents",
        "Vos conversations avec l’assistant IA",
        "Votre inscription à nos e-mails, si vous en aviez une",
      ],
      start: "Supprimer mon compte",
      confirmLabel: "Confirmez en saisissant votre adresse e-mail",
      confirmHint: "Saisissez « {email} » pour confirmer.",
      confirm: "Supprimer définitivement",
      deleting: "Suppression…",
    },
  },

  procedures: {
    title: "Démarches",
    subtitle: "Toutes les démarches administratives, expliquées étape par étape.",
    searchPlaceholder: "Rechercher une démarche, un organisme…",
    searchLabel: "Rechercher une démarche",
    all: "Toutes",
    resultsOne: "{count} démarche trouvée",
    resultsMany: "{count} démarches trouvées",
    emptyTitle: "Aucune démarche ne correspond",
    emptyText: "Essayez un autre mot-clé, ou retirez le filtre par organisme.",
    resetFilters: "Réinitialiser les filtres",
    week: "{count} semaine",
    weeks: "{count} semaines",
    weeksRange: "{min} à {max} semaines",
    documentsOne: "{count} document requis",
    documentsMany: "{count} documents requis",
    start: "Démarrer cette démarche",
    difficulty: { easy: "Facile", medium: "Moyen", hard: "Difficile" },
    items: {
      familyAllowance: {
        title: "Demande d'allocations familiales CAF",
        description:
          "Constituez votre dossier CAF pour bénéficier des aides selon votre situation familiale.",
      },
      businessStart: {
        title: "Déclaration de début d'activité URSSAF",
        description:
          "Déclarez votre activité professionnelle et obtenez votre immatriculation rapidement.",
      },
      healthInsurance: {
        title: "Ouverture des droits AMELI",
        description:
          "Activez votre couverture santé et demandez votre attestation de droits en ligne.",
      },
      jobseeker: {
        title: "Inscription à France Travail",
        description:
          "Inscrivez-vous comme demandeur d'emploi et accédez à vos allocations et services.",
      },
      residencePermit: {
        title: "Renouvellement titre de séjour",
        description:
          "Préparez et déposez votre demande de renouvellement auprès de la préfecture.",
      },
      incomeTax: {
        title: "Déclaration de revenus en ligne",
        description:
          "Complétez votre déclaration d'impôts annuelle avec les pièces justificatives nécessaires.",
      },
    },
  },

  packs: {
    title: "Nos packs",
    subtitle:
      "Un accompagnement pas à pas pour chaque démarche : checklist personnalisée, vérification des pièces et assistant IA dédié.",
    securePayment: "Paiement sécurisé par Stripe. Accès immédiat après confirmation.",
    bought: "Acheté",
    openPack: "Accéder au pack",
    choose: "Choisir ce pack",
    bestChoice: "Meilleur choix",
    allIncluded: "Toutes les démarches ci-dessus sont incluses.",
    insteadOf: "au lieu de",
    unlockAll: "Tout débloquer",
    /** Textes du catalogue, par slug (voir packsData.ts). */
    catalog: {
      "titre-sejour": {
        title: "Titre de séjour (ANEF)",
        shortDescription: "Accompagnement complet pour votre demande de titre de séjour.",
        features: [
          "Guide complet",
          "Choix du type de titre",
          "Checklist personnalisée",
          "Vérification des documents",
          "Assistance IA avancée",
          "Alertes (dates, RDV)",
        ],
      },
      "assurance-maladie": {
        title: "Assurance maladie (Ameli)",
        shortDescription: "Création et suivi de votre dossier sécurité sociale.",
        features: [
          "Guide complet",
          "Checklist documents",
          "Vérification des documents",
          "Assistance IA avancée",
          "Alertes documents manquants",
        ],
      },
      "aide-logement": {
        title: "Aide logement (CAF)",
        shortDescription: "Demande d'aide au logement simplifiée.",
        features: [
          "Simulation aides",
          "Guide CAF simplifié",
          "Aide remplissage",
          "Suivi dossier",
          "Notifications",
        ],
      },
      impots: {
        title: "Déclaration d'impôts",
        shortDescription: "Assistance pour votre déclaration fiscale.",
        features: [
          "Explication simplifiée",
          "Aide remplissage",
          "Vérification des données",
          "Simulation",
        ],
      },
      "pack-complet": {
        title: "Pack complet",
        shortDescription: "Toutes les démarches incluses avec accompagnement total.",
        features: ["Le contenu de tous les packs réunis en un seul !"],
      },
    },
  },
};
