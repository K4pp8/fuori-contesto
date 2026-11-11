# Direzione visiva

Fuori Contesto è un tavolo sociale, con un'interfaccia quieta intorno a contenuti irriverenti. Fondo caldo, testo carbone, accento verde chiaro, carte solide e controlli di vetro. Tipografia di sistema, niente font remoti o asset Apple proprietari.

Ispirazioni primarie: [Apple Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass), [Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials), [guida Design WWDC26](https://developer.apple.com/wwdc26/guides/design/). È un'interpretazione web, non un'implementazione dei componenti nativi Apple.

Usare traslucenza per navigazione e dock, superfici piene per carte e testo di gioco. Evitare effetti sovrapposti che tolgono contrasto. I controlli principali restano visibili su mobile e usabili da tastiera. Dialog nativo con focus confinato, nomi accessibili, stato di selezione sulle carte, annunci degli errori e della connessione. Rispetta `prefers-reduced-motion` e `prefers-contrast`.

Verificare home, lobby, mano, attesa, giudizio e vincitore su desktop e viewport da 390 px. Controllare nomi da 24 caratteri, risposte da 500 caratteri, carte multiple e connessione assente. I test automatici non sostituiscono prove con screen reader e dispositivi reali.
