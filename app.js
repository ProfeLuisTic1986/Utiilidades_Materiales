import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDO5NXqQF7lcBmA5vREi6o-EsQN7vYr6wI",
  authDomain: "materiales-2c561.firebaseapp.com",
  projectId: "materiales-2c561",
  storageBucket: "materiales-2c561.firebasestorage.app",
  messagingSenderId: "18978488844",
  appId: "1:18978488844:web:9c55115b561d9db219a429",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const allowedDomain = "isb.edu.mx";

provider.setCustomParameters({ hd: allowedDomain });

const baseMaterials = [
  "Placa de desarrollo",
  "Resistencias de 220 Ohm",
  "Protoboard",
  "Potenciometros de 10 kOhm",
  "LED verde",
  "LED rojo",
  "LED amarillo",
  "LED RGB",
  "Boton pulsador",
  "Cable USB A a B",
  "Cables para conexiones tipo Dupont",
  "Display de 7 segmentos",
  "Transistor NPN",
  "Motor",
  "Manual",
];

const extraOptions = [
  "Placa de desarrollo R3 compatible con Arduino UNO (ATMEGA328P, chip CH340G/16U2)",
  "Cable USB",
  "Protoboard grande MB-102 (830 puntos)",
  "Caja organizadora de almacenamiento",
  "Pantalla LCD 1602 (sin modulo I2C)",
  "Modulo RFID RC522 + 1 tarjeta blanca + 1 llavero azul",
  "Teclado matricial 4x4",
  "Modulo de matriz de puntos 8x8",
  "Display de 7 segmentos de 1 digito",
  "Display de 7 segmentos de 4 digitos",
  "Modulo joystick XY",
  "Modulo LED RGB de 3 colores",
  "Modulo de reloj en tiempo real DS1302",
  "Modulo de rele 5V",
  "Chip 74HC595",
  "Motor paso a paso 5V con driver ULN2003",
  "Servomotor SG90 9g",
  "Receptor infrarrojo + 1 control remoto",
  "Sensor de temperatura y humedad DHT11",
  "Sensor de temperatura LM35",
  "Sensor de sonido (KY-037)",
  "Sensor de nivel de agua",
  "Interruptor de inclinacion (bola)",
  "Zumbadores (1 activo + 1 pasivo)",
  "Pulsadores grandes con tapa verde",
  "Potenciometro de 10K",
  "Fotoresistencias (LDR)",
  "LEDs (5 rojos, 5 verdes, 5 amarillos)",
  "LED emisor infrarrojo",
  "Tira de pines 2.54mm",
  "Conector de bateria 9V",
  "Tarjeta de codigo de colores de resistencias",
  "Resistencias (5 x 220, 5 x 1K, 5 x 10K)",
  "Cables de puente / jumper (mezcla macho-macho y macho-hembra)",
];

const form = document.getElementById("prestamo-form");
const baseContainer = document.getElementById("base-materials");
const extraSelect = document.getElementById("extra-select");
const addExtraButton = document.getElementById("add-extra");
const addCustomButton = document.getElementById("add-custom");
const extraCustomInput = document.getElementById("extra-custom");
const extrasList = document.getElementById("extras-list");
const materialCount = document.getElementById("material-count");
const message = document.getElementById("form-message");
const authStatus = document.getElementById("auth-status");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authGate = document.getElementById("auth-gate");

const extrasState = new Map();

const toKey = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const getInitials = (value) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("");

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const sanitizeText = (value) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

const responsableNombreInput = form.querySelector("input[name='responsableNombre']");
const responsableFirmaInput = form.querySelector("input[name='responsableFirma']");
const firmaAlumnoInput = form.querySelector("input[name='firmaAlumno']");

const syncInitials = () => {
  const responsableIniciales = getInitials(responsableNombreInput.value);
  responsableFirmaInput.value = responsableIniciales;
  firmaAlumnoInput.value = responsableIniciales;
};

const setAuthUi = (user) => {
  if (!user) {
    authStatus.textContent = "No has iniciado sesion";
    loginBtn.disabled = false;
    logoutBtn.disabled = true;
    authGate.classList.remove("hidden");
    form.classList.add("hidden");
    return;
  }

  authStatus.textContent = `Sesion: ${user.email}`;
  loginBtn.disabled = true;
  logoutBtn.disabled = false;
  authGate.classList.add("hidden");
  form.classList.remove("hidden");
};

loginBtn.addEventListener("click", async () => {
  message.textContent = "";
  try {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) {
      const result = await signInWithPopup(auth, provider);
      const email = result.user?.email || "";
      if (!email.endsWith(`@${allowedDomain}`)) {
        await signOut(auth);
        message.textContent = `Solo se permite correo @${allowedDomain}.`;
        message.className = "form-message error";
      }
      return;
    }
    await signInWithRedirect(auth, provider);
  } catch (error) {
    message.textContent = "No se pudo iniciar sesion.";
    message.className = "form-message error";
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user?.email && !user.email.endsWith(`@${allowedDomain}`)) {
    message.textContent = `Usa tu correo escolar @${allowedDomain}.`;
    message.className = "form-message error";
    signOut(auth);
    setAuthUi(null);
    return;
  }
  setAuthUi(user);
});

getRedirectResult(auth)
  .then((result) => {
    const email = result?.user?.email || "";
    if (email && !email.endsWith(`@${allowedDomain}`)) {
      signOut(auth);
      message.textContent = `Solo se permite correo @${allowedDomain}.`;
      message.className = "form-message error";
    }
  })
  .catch((error) => {
    if (!error) return;
    message.textContent = "No se pudo iniciar sesion.";
    message.className = "form-message error";
    console.error(error);
  });

const updateMaterialCount = () => {
  const baseSelected = [...baseContainer.querySelectorAll("input[type='checkbox']")].filter(
    (input) => input.checked
  ).length;
  const extraSelected = extrasState.size;
  materialCount.textContent = String(baseSelected + extraSelected);
};

const renderBaseMaterials = () => {
  baseMaterials.forEach((material) => {
    const key = toKey(material);
    const wrapper = document.createElement("div");
    wrapper.className = "material-card";
    wrapper.innerHTML = `
      <label class="material-row">
        <input type="checkbox" name="base-${key}" data-material="${material}">
        ${material}
      </label>
      <div class="material-row">
        <span>Cantidad</span>
        <input type="number" name="qty-${key}" min="1" value="1">
      </div>
    `;
    baseContainer.appendChild(wrapper);
  });

  baseContainer.addEventListener("change", updateMaterialCount);
};

const renderExtraOptions = () => {
  extraOptions.forEach((material) => {
    const option = document.createElement("option");
    option.value = material;
    option.textContent = material;
    extraSelect.appendChild(option);
  });
};

const renderExtras = () => {
  extrasList.innerHTML = "";
  extrasState.forEach((qty, name) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `
      <span>${name}</span>
      <input type="number" min="1" value="${qty}" aria-label="Cantidad de ${name}">
      <button type="button" aria-label="Quitar ${name}">Quitar</button>
    `;
    const qtyInput = chip.querySelector("input");
    const removeButton = chip.querySelector("button");

    qtyInput.addEventListener("input", () => {
      const nextValue = Number.parseInt(qtyInput.value, 10);
      extrasState.set(name, Number.isNaN(nextValue) ? 1 : nextValue);
    });

    removeButton.addEventListener("click", () => {
      extrasState.delete(name);
      renderExtras();
      updateMaterialCount();
    });

    extrasList.appendChild(chip);
  });
};

const addExtra = (value) => {
  const trimmed = sanitizeText(value);
  if (!trimmed) return;
  if (!extrasState.has(trimmed)) {
    extrasState.set(trimmed, 1);
    renderExtras();
    updateMaterialCount();
  }
};

addExtraButton.addEventListener("click", () => {
  addExtra(extraSelect.value);
  extraSelect.value = "";
});

addCustomButton.addEventListener("click", () => {
  addExtra(extraCustomInput.value);
  extraCustomInput.value = "";
});

form.addEventListener("reset", () => {
  extrasState.clear();
  renderExtras();
  updateMaterialCount();
  message.textContent = "";
  syncInitials();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  if (!auth.currentUser) {
    message.textContent = "Inicia sesion con tu correo escolar antes de guardar.";
    message.className = "form-message error";
    return;
  }

  const formData = new FormData(form);

  const baseSelected = [];
  baseMaterials.forEach((material) => {
    const key = toKey(material);
    const checked = formData.get(`base-${key}`) === "on";
    if (checked) {
      const qty = Number.parseInt(formData.get(`qty-${key}`), 10) || 1;
      baseSelected.push({ material, cantidad: qty });
    }
  });

  const extrasSelected = [...extrasState.entries()].map(([material, cantidad]) => ({
    material,
    cantidad,
  }));

  if (baseSelected.length === 0 && extrasSelected.length === 0) {
    message.textContent = "Selecciona al menos un material antes de guardar.";
    message.className = "form-message error";
    return;
  }

  const data = {
    asignatura: sanitizeText(formData.get("asignatura")),
    proyecto: sanitizeText(formData.get("proyecto")),
    fecha: sanitizeText(formData.get("fecha")),
    grupo: sanitizeText(formData.get("grupo")),
    profesor: sanitizeText(formData.get("profesor")),
    mesa: sanitizeText(formData.get("mesa")),
    kitId: sanitizeText(formData.get("kitId")),
    integrantes: sanitizeText(formData.get("integrantes")),
    responsable: {
      nombre: sanitizeText(formData.get("responsableNombre")),
      firma: sanitizeText(formData.get("responsableFirma")),
    },
    materiales: {
      base: baseSelected.map((item) => ({
        material: sanitizeText(item.material),
        cantidad: item.cantidad,
      })),
      extras: extrasSelected.map((item) => ({
        material: sanitizeText(item.material),
        cantidad: item.cantidad,
      })),
    },
    estado: {
      recibir: sanitizeText(formData.get("recibirEstado")),
      recibirObservaciones: sanitizeText(formData.get("recibirObservaciones")),
      devolver: sanitizeText(formData.get("devolverEstado")),
      devolverObservaciones: sanitizeText(formData.get("devolverObservaciones")),
    },
    observacionesFinales: sanitizeText(formData.get("observacionesFinales")),
    compromiso: {
      firmaAlumno: sanitizeText(formData.get("firmaAlumno")),
    },
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "prestamos"), data);
    message.textContent = "Registro guardado en Firebase.";
    message.className = "form-message success";
    const responsable = sanitizeText(formData.get("responsableNombre"));
    const kitId = sanitizeText(formData.get("kitId"));
    const fecha = formatDate(sanitizeText(formData.get("fecha")));
    const grupo = sanitizeText(formData.get("grupo"));
    alert(
      `✅ Registro guardado\nResponsable: ${responsable}\nKit: ${kitId}\nFecha: ${fecha}\nGrupo: ${grupo}`
    );
    form.reset();
  } catch (error) {
    message.textContent = "No se pudo guardar el registro. Revisa la consola.";
    message.className = "form-message error";
    console.error(error);
  }
});

renderBaseMaterials();
renderExtraOptions();
updateMaterialCount();
syncInitials();
setAuthUi(null);

responsableNombreInput.addEventListener("input", syncInitials);
