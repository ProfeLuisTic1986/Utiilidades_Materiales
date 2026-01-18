import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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
const levelSelect = document.getElementById("level-select");
const selectPrimary = document.getElementById("select-primary");
const selectSecondary = document.getElementById("select-secondary");
const heroEyebrow = document.getElementById("hero-eyebrow");
const heroTitle = document.getElementById("hero-title");
const heroSubtitle = document.getElementById("hero-subtitle");
const heroProfesor = document.getElementById("hero-profesor");
const profesorInput = form.querySelector("input[name='profesor']");
const folioPanel = document.getElementById("folio-panel");
const folioValue = document.getElementById("folio-value");
const folioInput = document.getElementById("folio-input");
const copyFolioButton = document.getElementById("copy-folio");
const editFolioButton = document.getElementById("edit-folio");
const reuseFolioButton = document.getElementById("reuse-folio");
const asignaturaInput = form.querySelector("input[name='asignatura']");

const extrasState = new Map();
let currentLevel = "primary";
let editMode = false;
let currentDocId = null;
let currentFolio = null;

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

const generateFolio = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `F-${stamp}-${rand}`;
};

const setFolioPanel = (folio) => {
  if (!folio) {
    folioPanel.classList.add("hidden");
    folioValue.textContent = "-";
    folioInput.value = "";
    currentFolio = null;
    return;
  }
  folioPanel.classList.remove("hidden");
  folioValue.textContent = folio;
  folioInput.value = folio;
  currentFolio = folio;
};

const responsableNombreInput = form.querySelector("input[name='responsableNombre']");
const responsableFirmaInput = form.querySelector("input[name='responsableFirma']");
const firmaAlumnoInput = form.querySelector("input[name='firmaAlumno']");
const body = document.body;

const syncInitials = () => {
  const responsableIniciales = getInitials(responsableNombreInput.value);
  responsableFirmaInput.value = responsableIniciales;
  firmaAlumnoInput.value = responsableIniciales;
};

const applyLevel = (level) => {
  currentLevel = level === "secondary" ? "secondary" : "primary";
  if (level === "secondary") {
    body.classList.add("theme-secondary");
    body.classList.remove("theme-primary");
    heroEyebrow.textContent = "PROGRAMACION";
    heroTitle.textContent = "📋 Formato de prestamo de kit de trabajo - Secundaria";
    heroSubtitle.textContent = "Registro dinamico para practicas de tecnologia en secundaria.";
    heroProfesor.textContent = "Profesor: Saul Francisco Alejandre Cuevas";
    profesorInput.value = "Saul Francisco Alejandre Cuevas";
    asignaturaInput.value = "Programación";
  } else {
    body.classList.add("theme-primary");
    body.classList.remove("theme-secondary");
    heroEyebrow.textContent = "TECNOLOGíAs 💻";
    heroTitle.textContent = "📋 Formato unico de prestamo de kit de trabajo";
    heroSubtitle.textContent = "Registro dinamico y didactico para practicas de tecnologia.";
    heroProfesor.textContent = "Profesor: Luis Alfonso Martinez Alfaro";
    profesorInput.value = "Luis Alfonso Martinez Alfaro";
    asignaturaInput.value = "";
  }
};

const setAuthUi = (user) => {
  if (!user) {
    authStatus.textContent = "No has iniciado sesion";
    loginBtn.disabled = false;
    logoutBtn.disabled = true;
    authGate.classList.remove("hidden");
    form.classList.add("hidden");
    levelSelect.classList.add("hidden");
    setFolioPanel(null);
    editMode = false;
    currentDocId = null;
    applyLevel("primary");
    return;
  }

  authStatus.textContent = `Sesion: ${user.email}`;
  loginBtn.disabled = true;
  logoutBtn.disabled = false;
  authGate.classList.add("hidden");
  levelSelect.classList.remove("hidden");
  form.classList.add("hidden");
  setFolioPanel(null);
  editMode = false;
  currentDocId = null;
};

loginBtn.addEventListener("click", async () => {
  message.textContent = "";
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user?.email || "";
    if (!email.endsWith(`@${allowedDomain}`)) {
      await signOut(auth);
      message.textContent = `Solo se permite correo @${allowedDomain}.`;
      message.className = "form-message error";
    }
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

const fillForm = (data) => {
  form.reset();

  form.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = false;
  });
  form.querySelectorAll("input[type='number']").forEach((input) => {
    input.value = "1";
  });
  form.querySelectorAll("input[type='radio']").forEach((input) => {
    input.checked = false;
  });

  form.querySelector("input[name='asignatura']").value = data.asignatura || "";
  form.querySelector("input[name='proyecto']").value = data.proyecto || "";
  form.querySelector("input[name='fecha']").value = data.fecha || "";
  form.querySelector("input[name='grupo']").value = data.grupo || "";
  profesorInput.value = data.profesor || profesorInput.value;
  form.querySelector("input[name='mesa']").value = data.mesa || "";
  form.querySelector("input[name='kitId']").value = data.kitId || "";
  form.querySelector("textarea[name='integrantes']").value = data.integrantes || "";
  responsableNombreInput.value = data.responsable?.nombre || "";
  syncInitials();

  form.querySelector("textarea[name='recibirObservaciones']").value =
    data.estado?.recibirObservaciones || "";
  form.querySelector("textarea[name='devolverObservaciones']").value =
    data.estado?.devolverObservaciones || "";
  form.querySelector("textarea[name='observacionesFinales']").value =
    data.observacionesFinales || "";

  if (data.estado?.recibir) {
    const recibirInput = form.querySelector(
      `input[name='recibirEstado'][value='${data.estado.recibir}']`
    );
    if (recibirInput) recibirInput.checked = true;
  }

  if (data.estado?.devolver) {
    const devolverInput = form.querySelector(
      `input[name='devolverEstado'][value='${data.estado.devolver}']`
    );
    if (devolverInput) devolverInput.checked = true;
  }

  const baseMap = new Map(
    (data.materiales?.base || []).map((item) => [item.material, item.cantidad])
  );
  baseMaterials.forEach((material) => {
    const key = toKey(material);
    const checkbox = form.querySelector(`input[name='base-${key}']`);
    const qtyInput = form.querySelector(`input[name='qty-${key}']`);
    if (!checkbox || !qtyInput) return;
    if (baseMap.has(material)) {
      checkbox.checked = true;
      qtyInput.value = String(baseMap.get(material) || 1);
    }
  });

  extrasState.clear();
  (data.materiales?.extras || []).forEach((item) => {
    const name = sanitizeText(item.material);
    if (name) {
      extrasState.set(name, Number(item.cantidad) || 1);
    }
  });
  renderExtras();
  updateMaterialCount();
};

const fetchByFolio = async (folio) => {
  const queryRef = query(
    collection(db, "prestamos"),
    where("folio", "==", folio),
    limit(1)
  );
  const snapshot = await getDocs(queryRef);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
};

const loadByFolio = async (folio, mode) => {
  const cleaned = sanitizeText(folio).toUpperCase();
  if (!cleaned) {
    message.textContent = "Escribe un folio valido.";
    message.className = "form-message error";
    return;
  }
  if (!auth.currentUser) {
    message.textContent = "Inicia sesion para editar o reutilizar.";
    message.className = "form-message error";
    return;
  }
  const result = await fetchByFolio(cleaned);
  if (!result) {
    message.textContent = "No se encontro un registro con ese folio.";
    message.className = "form-message error";
    return;
  }
  const owner = (result.data.createdByEmail || "").toLowerCase();
  const current = (auth.currentUser.email || "").toLowerCase();
  if (owner && owner !== current) {
    message.textContent = "Este folio pertenece a otro correo.";
    message.className = "form-message error";
    return;
  }

  if (result.data.seccion) {
    applyLevel(result.data.seccion);
  }
  fillForm(result.data);

  if (mode === "edit") {
    editMode = true;
    currentDocId = result.id;
    setFolioPanel(result.data.folio || cleaned);
    message.textContent = "Modo edicion activado.";
    message.className = "form-message success";
    return;
  }

  editMode = false;
  currentDocId = null;
  message.textContent = "Datos cargados para reutilizar.";
  message.className = "form-message success";
};

addExtraButton.addEventListener("click", () => {
  addExtra(extraSelect.value);
  extraSelect.value = "";
});

addCustomButton.addEventListener("click", () => {
  addExtra(extraCustomInput.value);
  extraCustomInput.value = "";
});

copyFolioButton.addEventListener("click", async () => {
  const folio = folioValue.textContent;
  if (!folio || folio === "-") return;
  try {
    await navigator.clipboard.writeText(folio);
    message.textContent = "Folio copiado.";
    message.className = "form-message success";
  } catch (error) {
    console.error(error);
  }
});

editFolioButton.addEventListener("click", () => {
  loadByFolio(folioInput.value, "edit");
});

reuseFolioButton.addEventListener("click", () => {
  loadByFolio(folioInput.value, "reuse");
});

form.addEventListener("reset", () => {
  extrasState.clear();
  renderExtras();
  updateMaterialCount();
  message.textContent = "";
  syncInitials();
  applyLevel(currentLevel);
  setFolioPanel(null);
  editMode = false;
  currentDocId = null;
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

  try {
    const baseData = {
      asignatura: sanitizeText(formData.get("asignatura")),
      proyecto: sanitizeText(formData.get("proyecto")),
      fecha: sanitizeText(formData.get("fecha")),
      grupo: sanitizeText(formData.get("grupo")),
      profesor: sanitizeText(formData.get("profesor")),
      mesa: sanitizeText(formData.get("mesa")),
      kitId: sanitizeText(formData.get("kitId")),
      integrantes: sanitizeText(formData.get("integrantes")),
      seccion: currentLevel,
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
    };

    let folio = currentFolio;

    if (editMode && currentDocId) {
      await updateDoc(doc(db, "prestamos", currentDocId), {
        ...baseData,
        updatedAt: serverTimestamp(),
        updatedByEmail: auth.currentUser.email,
      });
      message.textContent = "Registro actualizado.";
      message.className = "form-message success";
      setFolioPanel(folio);
    } else {
      folio = generateFolio();
      await addDoc(collection(db, "prestamos"), {
        ...baseData,
        folio,
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser.email,
        createdByUid: auth.currentUser.uid,
      });
      message.textContent = "Registro guardado en Firebase.";
      message.className = "form-message success";
      setFolioPanel(folio);
    }

    const responsable = sanitizeText(formData.get("responsableNombre"));
    const kitId = sanitizeText(formData.get("kitId"));
    const fecha = formatDate(sanitizeText(formData.get("fecha")));
    const grupo = sanitizeText(formData.get("grupo"));
    alert(
      `✅ ${editMode ? "Registro actualizado" : "Registro guardado"}\nResponsable: ${responsable}\nKit: ${kitId}\nFecha: ${fecha}\nGrupo: ${grupo}\nFolio: ${folio || currentFolio || "-"}`
    );
    editMode = false;
    currentDocId = null;
    form.reset();
    setFolioPanel(folio);
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
applyLevel("primary");
setAuthUi(null);

responsableNombreInput.addEventListener("input", syncInitials);
selectPrimary.addEventListener("click", () => {
  applyLevel("primary");
  levelSelect.classList.add("hidden");
  form.classList.remove("hidden");
});

selectSecondary.addEventListener("click", () => {
  applyLevel("secondary");
  levelSelect.classList.add("hidden");
  form.classList.remove("hidden");
});
