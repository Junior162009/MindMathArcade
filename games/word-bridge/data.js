export const EASY_LINGO_VERSION = 2;
export const WORDS = [
 {id:"apple",en:"apple",es:"manzana",emoji:"🍎",cat:"food",level:1},
 {id:"book",en:"book",es:"libro",emoji:"📖",cat:"school",level:1},
 {id:"house",en:"house",es:"casa",emoji:"🏠",cat:"home",level:1},
 {id:"dog",en:"dog",es:"perro",emoji:"🐶",cat:"animals",level:1},
 {id:"cat",en:"cat",es:"gato",emoji:"🐱",cat:"animals",level:1},
 {id:"car",en:"car",es:"carro",emoji:"🚗",cat:"transport",level:1},
 {id:"sun",en:"sun",es:"sol",emoji:"☀️",cat:"nature",level:1},
 {id:"school",en:"school",es:"escuela",emoji:"🏫",cat:"school",level:1},
 {id:"water",en:"water",es:"agua",emoji:"💧",cat:"food",level:1},
 {id:"tree",en:"tree",es:"árbol",emoji:"🌳",cat:"nature",level:1},
 {id:"fish",en:"fish",es:"pez",emoji:"🐟",cat:"animals",level:1},
 {id:"bread",en:"bread",es:"pan",emoji:"🍞",cat:"food",level:2},
 {id:"milk",en:"milk",es:"leche",emoji:"🥛",cat:"food",level:2},
 {id:"shirt",en:"shirt",es:"camisa",emoji:"👕",cat:"clothes",level:2},
 {id:"shoes",en:"shoes",es:"zapatos",emoji:"👟",cat:"clothes",level:2},
 {id:"family",en:"family",es:"familia",emoji:"👨‍👩‍👧",cat:"family",level:2},
 {id:"bus",en:"bus",es:"autobús",emoji:"🚌",cat:"transport",level:2},
 {id:"teacher",en:"teacher",es:"profesor",emoji:"🧑‍🏫",cat:"school",level:2},
 {id:"garden",en:"garden",es:"jardín",emoji:"🌻",cat:"nature",level:2},
 {id:"breakfast",en:"breakfast",es:"desayuno",emoji:"🥞",cat:"food",level:3},
 {id:"library",en:"library",es:"biblioteca",emoji:"📚",cat:"school",level:3},
 {id:"bicycle",en:"bicycle",es:"bicicleta",emoji:"🚲",cat:"transport",level:3},
 {id:"rainbow",en:"rainbow",es:"arcoíris",emoji:"🌈",cat:"nature",level:3},
 {id:"jacket",en:"jacket",es:"chaqueta",emoji:"🧥",cat:"clothes",level:3},
 {id:"neighbor",en:"neighbor",es:"vecino",emoji:"🏘️",cat:"family",level:3},
 {id:"kitchen",en:"kitchen",es:"cocina",emoji:"🍳",cat:"home",level:4},
 {id:"mountain",en:"mountain",es:"montaña",emoji:"⛰️",cat:"nature",level:4},
 {id:"adventure",en:"adventure",es:"aventura",emoji:"🗺️",cat:"nature",level:4},
 {id:"friendship",en:"friendship",es:"amistad",emoji:"🤝",cat:"family",level:4},
 {id:"environment",en:"environment",es:"medio ambiente",emoji:"🌎",cat:"nature",level:5},
 {id:"knowledge",en:"knowledge",es:"conocimiento",emoji:"🧠",cat:"school",level:5},
 {id:"achievement",en:"achievement",es:"logro",emoji:"🏆",cat:"school",level:5},
 {id:"banana",en:"banana",es:"banano",emoji:"🍌",cat:"food",level:1},
 {id:"orange",en:"orange",es:"naranja",emoji:"🍊",cat:"food",level:1},
 {id:"bird",en:"bird",es:"pájaro",emoji:"🐦",cat:"animals",level:1},
 {id:"horse",en:"horse",es:"caballo",emoji:"🐴",cat:"animals",level:2},
 {id:"door",en:"door",es:"puerta",emoji:"🚪",cat:"home",level:2},
 {id:"window",en:"window",es:"ventana",emoji:"🪟",cat:"home",level:2},
 {id:"pencil",en:"pencil",es:"lápiz",emoji:"✏️",cat:"school",level:3}
];
export const LEVELS=[
 {id:1,name:"BEGINNER",color:"green",minWords:1},
 {id:2,name:"ELEMENTARY",color:"blue",minWords:2},
 {id:3,name:"INTERMEDIATE",color:"purple",minWords:3},
 {id:4,name:"ADVANCED",color:"orange",minWords:4},
 {id:5,name:"MASTER",color:"red",minWords:5}
];
export const CATEGORIES={food:"🍎 Comida",animals:"🐾 Animales",home:"🏠 Casa",clothes:"👕 Ropa",transport:"🚗 Transporte",nature:"🌳 Naturaleza",family:"👨‍👩‍👧 Familia",school:"📚 Escuela"};
export const QUESTION_TYPES=["imageToWord","esToEn","enToEs","write","letters","wordToImage","listen","vocabulary"];

// Banco oficial: 40 palabras x 5 modalidades = 200 preguntas únicas.
// Cada entrada tiene un ID estable para impedir repeticiones dentro de una partida.
export const QUESTION_BANK = WORDS.slice(0,40).flatMap((word,index)=>[
 {id:`q-${index+1}-image`,wordId:word.id,type:"imageToWord"},
 {id:`q-${index+1}-es-en`,wordId:word.id,type:"esToEn"},
 {id:`q-${index+1}-en-es`,wordId:word.id,type:"enToEs"},
 {id:`q-${index+1}-write`,wordId:word.id,type:"write"},
 {id:`q-${index+1}-letters`,wordId:word.id,type:"letters"}
]);
export const QUESTION_BANK_SIZE = QUESTION_BANK.length;