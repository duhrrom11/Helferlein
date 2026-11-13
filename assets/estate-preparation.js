(function(root){
 'use strict';
 const steps=[
  {id:'bank',title:'Banken und Versicherungen',question:'Welche Konten und Versicherungen gibt es? Wo liegen die Unterlagen?',category:'Finanzen'},
  {id:'contracts',title:'Verträge und Abonnements',question:'Welche Verträge sollen später gekündigt oder weitergeführt werden?',category:'Verträge'},
  {id:'digital',title:'E-Mail, Online-Konten und Geräte',question:'Welche Konten sind wichtig? Wie findet man die Anmeldung und die zweite Anmeldebestätigung?',category:'Digital'},
  {id:'originals',title:'Wichtige Originale',question:'Wo liegen Vollmachten, Verfügungen und andere wichtige Originale?',category:'Rechtliches'},
  {id:'memories',title:'Fotos und Erinnerungen',question:'Was soll erhalten bleiben und wer soll es bekommen?',category:'Posthum'},
  {id:'contacts',title:'Wichtige Ansprechpartner',question:'Wer kennt sich aus? Notiere zum Beispiel Ansprechpartner bei Bank, Versicherung oder Bestattungsunternehmen.',category:'Sonstiges'},
  {id:'funeral',title:'Meine Bestattungswünsche',question:'Wie wünsche ich mir mein Begräbnis? Was ist mir bei Abschied, Musik oder Trauerfeier wichtig?',category:'Posthum'},
  {id:'people',title:'Vertrauenspersonen informieren',question:'Haben mindestens zwei Vertrauenspersonen ihren persönlichen Schlüssel und wissen sie, wofür er ist?',category:'Sonstiges'}
 ];
 root.EstatePreparation={steps};if(typeof module!=='undefined')module.exports=root.EstatePreparation;
})(globalThis);
