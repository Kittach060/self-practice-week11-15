import keycloak from "../keycloak-js.js";

let studentId = null;
let declaredPlan = null;
let currentTimezone = "Asia/Bangkok";
let statusEl, dropdownEl, declareBtn, cancelBtn, logoutBtn, dialogEl, dialogMsg, dialogCloseBtn, changeBtn, dialogConfirmBtn, dialogCancelBtn;
let plansMap = {}; // map planId -> plan object
const API_PREFIX = "/intproj25/pl2/itb-ecors/api";


document.addEventListener("DOMContentLoaded", async () => {
    statusEl = document.getElementById("status");
    dropdownEl = document.getElementById("planDropdown");
    dialogEl = document.getElementById("dialog");
    dialogMsg = document.getElementById("dialogMsg");
    dialogCloseBtn = document.getElementById("dialogCloseBtn");
    logoutBtn = document.getElementById("ecors-button-signout");
    declareBtn = document.getElementById("declareBtn");
    changeBtn = document.getElementById("changeBtn");
    cancelBtn = document.getElementById("cancelBtn");

    dialogConfirmBtn = document.createElement("button");
    dialogConfirmBtn.id = "dialogConfirmBtn";
    dialogConfirmBtn.textContent = "Cancel Declaration";
    dialogConfirmBtn.style.display = "none";
    //dialogConfirmBtn.classList.add("ecors-button-dialog");
    //dialogConfirmBtn.classList.add("ecors-button-cancel");

    dialogCancelBtn = document.createElement("button");
    dialogCancelBtn.id = "dialogCancelBtn";
    dialogCancelBtn.textContent = "Keep Declaration";
    dialogCancelBtn.style.display = "none";
    //dialogCancelBtn.classList.add("ecors-button-dialog");
    //dialogCancelBtn.classList.add("ecors-button-keep");

    dialogEl.appendChild(dialogConfirmBtn);
    dialogEl.appendChild(dialogCancelBtn);

    document.getElementById("username").classList.add("ecors-fullname");
    logoutBtn.classList.add("ecors-button-signout");
    statusEl.classList.add("ecors-declared-plan");
    dropdownEl.classList.add("ecors-dropdown-plan");
    declareBtn.classList.add("ecors-button-declare");
    dialogEl.classList.add("ecors-dialog");
    dialogMsg.classList.add("ecors-dialog-message");
    dialogCloseBtn.classList.add("ecors-button-dialog");
    dialogConfirmBtn.classList.add("ecors-button-cancel");
    dialogCancelBtn.classList.add("ecors-button-keep");
    declareBtn.disabled = false;
    dropdownEl.disabled = false;
    declareBtn.style.visibility = "visible";
    declareBtn.style.display = "inline-block";
    // Initialize Keycloak
    try {
        await keycloak.init({
            onLoad: "login-required",
            redirectUri: window.location.origin + '/intproj25/pl2/itb-ecors/reserve.html'
        });
    }  catch (err) {
        showDialog("Authentication error");
        return;
    }

    // Get student ID
    studentId = keycloak.tokenParsed.preferred_username;
    document.getElementById("username").textContent =
        keycloak.tokenParsed.name || studentId;

    // Load status + study plans
    await loadDeclarationStatus();
    await loadStudyPlans();

    dropdownEl.addEventListener("change", () => {
      if (dropdownEl.value === "-- Select Major --" || dropdownEl.value === "") {
          declareBtn.disabled = true;
          declareBtn.style.display = "none";
          //updateChangeButtonState();
      } else {
          //declareBtn.style.display = "inline-block";
          declareBtn.disabled = false;
          updateChangeButtonState();
      }
    updateChangeButtonState();
  });
    declareBtn.addEventListener("click", declarePlan);
    cancelBtn.addEventListener("click", confirmCancelDeclaration);
    changeBtn.addEventListener("click", changePlan);
    logoutBtn.addEventListener("click", () => {
        keycloak.logout({
            redirectUri: window.location.origin + '/intproj25/pl2/itb-ecors/'
        });
    });
    dialogCloseBtn.addEventListener("click", () => dialogEl.close());
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") dialogEl.close();
    });

    dialogConfirmBtn.addEventListener("click", () => {
        dialogEl.close();
        actuallyCancelPlan();
    });

    dialogCancelBtn.addEventListener("click", () => {
        dialogEl.close();
    });

    // Monitor timezone changes and refresh display every second
    setInterval(() => {
        const newTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (newTz !== currentTimezone) {
            currentTimezone = newTz;
            if (declaredPlan) {
                updateStatusDisplay();
            }
        }
    }, 1000);
});

// --------------------------------------------------
// Helper: Format time with current timezone
// --------------------------------------------------
function formatTimeWithTimezone(dateString) {
    try {
        if (!dateString) return "Invalid Date";

        // If the incoming timestamp is an ISO string without timezone (e.g. "2025-11-11T01:00:00"),
        // Date() will treat it as local time. To avoid that and treat timezone-less values as UTC,
        // append a 'Z' when there's no timezone offset or Z present.
        let normalized = dateString;
        if (typeof normalized === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
            normalized = normalized + 'Z';
        }

        const date = new Date(normalized);
        if (isNaN(date.getTime())) {
            console.warn('formatTimeWithTimezone: invalid date string', dateString);
            return "Invalid Date";
        }

        const localTime = date.toLocaleString("en-GB", {
            timeZone: currentTimezone
        });
        return localTime;
    } catch (e) {
        console.error("Date formatting error:", e);
        return "Invalid Date";
    }
}
// --------------------------------------------------
// Helper: Update status display with current timezone
// --------------------------------------------------
function updateStatusDisplay() {
    if (!declaredPlan) return;

    // Debug: Check what properties are available
    console.log("declaredPlan:", declaredPlan);

    // Use updated_at or updatedAt depending on what the API returns
    const dateValue = declaredPlan.updatedAt || declaredPlan.updatedAt;
    const localTime = formatTimeWithTimezone(dateValue);

    const planId = declaredPlan.planId || declaredPlan.planId;
    let planText = `Plan ID ${planId}`;
    const planObj = plansMap[planId];
    if (planObj) {
        const code = planObj.planCode || planObj.study_code || planObj.plan_code || planObj.planCode || '';
        const name = planObj.nameEng || planObj.name_eng || planObj.plan_name_eng || planObj.nameEng || '';
        planText = `${code} - ${name}`.trim();
    }

    statusEl.textContent =
        `Declaration Status: Declared ${planText} on ${localTime} (${currentTimezone})`;
}

// --------------------------------------------------
// Load Declaration Status
// --------------------------------------------------
async function loadDeclarationStatus() {
    try {
        // *** FIX 4: ใช้ API_PREFIX ***
        const res = await fetch(`${API_PREFIX}/v1/students/${studentId}/declared-plan`);

        if (res.status === 404) {
            statusEl.textContent = "Declaration Status: Not Declared";
            declaredPlan = null;
            enableDeclareFeature(true);
            cancelBtn.style.display = "none";
            changeBtn.style.display = "none";
            return;
        }

        if (!res.ok) throw new Error();

        declaredPlan = await res.json();
        updateChangeButtonState();
        updateStatusDisplay();
        enableDeclareFeature(false);
        cancelBtn.style.display = "inline-block";
        changeBtn.style.display = "inline-block";
        declareBtn.style.display = "none";

    } catch (e) {
        statusEl.textContent = "Error: unable to load status.";
        enableDeclareFeature(false);
    }
}

function enableDeclareFeature(enable) {
         if (enable) {
            declareBtn.disabled = (dropdownEl.value === "" || dropdownEl.value === "-- Select Major --");
         } else {
            declareBtn.disabled = true;
            declareBtn.style.display = 'none';
         }
}

// --------------------------------------------------
// Load Study Plans
// --------------------------------------------------
async function loadStudyPlans() {
    const res = await fetch(`${API_PREFIX}/v1/study-plans`);

    if (!res.ok) {
        showDialog("Unable to load study plan list.");
        return;
    }

    const list = await res.json();
    // Populate dropdown and build plansMap
    dropdownEl.innerHTML = `<option value="">-- Select Major --</option>`;
    plansMap = {};
    list.forEach((p) => {
        plansMap[p.id] = p;
        const opt = document.createElement("option");
        opt.value = p.id;
        const code = p.planCode || p.study_code || p.plan_code || p.planCode;
        const name = p.nameEng || p.name_eng || p.plan_name_eng || p.nameEng;
        opt.textContent = `${code} - ${name}`;
        opt.classList.add("ecors-plan-row");
        opt.classList.add("ecors-plan-code");
        opt.classList.add("ecors-plan-name");
        dropdownEl.appendChild(opt);
    });
    if (declaredPlan) {
        updateStatusDisplay();
    }
}

function updateChangeButtonState() {
    if (!declaredPlan) {
        changeBtn.disabled = true;
        return;
    }

    const currentId = declaredPlan.planId ?? declaredPlan.plan_id;
    const selected = Number(dropdownEl.value);

    if (!selected || selected === currentId || dropdownEl.value === "-- Select Major --" || dropdownEl.value === "") {
        changeBtn.disabled = true;
    } else {
        changeBtn.disabled = false;
    }
}

// --------------------------------------------------
// Declare Plan
// --------------------------------------------------
async function declarePlan() {
    const planId = Number(dropdownEl.value);
    if (!Number.isInteger(planId) || planId <= 0) {
        showDialog("Invalid plan selected.");
        return;
    }
    let res;
    try {
        res = await fetch(`${API_PREFIX}/v1/students/${studentId}/declared-plan`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify({ planId }),
    });
   } catch (err) {
        showDialog("There is a problem. Please try again later.")
     return;
   }
    if (res.status === 201) {
        const newRecord = await res.json();
        declaredPlan = newRecord;
        updateStatusDisplay();
        updateChangeButtonState();
        enableDeclareFeature(false);
        cancelBtn.style.display = "inline-block";
        changeBtn.style.display = "inline-block";
        return;
    }

    if (res.status === 409) {
        showDialog("You may have declared study plan already. Please check again.");
        await loadDeclarationStatus();
        return;
    }

     if (res.status === 500) {
        showDialog("There is a problem. Please try again later.");
        await loadDeclarationStatus();
        return;
    }

    if (res.message) {
        showDialog("There is a problem. Please try again later.");
        return;
    }
    showDialog("There is a problem. Please try again later.");
}

// --------------------------------------------------
//  Change Plan
// --------------------------------------------------
async function changePlan() {
    const newPlanId = Number(dropdownEl.value);

    if (!newPlanId) {
        showDialog("Please select a plan first.");
        return;
    }

    const currentId = declaredPlan.planId ?? declaredPlan.plan_id;

    if (newPlanId === currentId) {
        showDialog("You already declared this plan.");
        return;
    }

    try {
        const res = await fetch(`${API_PREFIX}/v1/students/${studentId}/declared-plan`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${keycloak.token}`,
            },
            body: JSON.stringify({ planId: newPlanId }),
        });

        if (res.status === 200) {
            declaredPlan = await res.json();
            updateChangeButtonState();
            updateStatusDisplay();

            enableDeclareFeature(false);
            cancelBtn.style.display = "inline-block";
            changeBtn.style.display = "inline-block";

            showDialog("Declaration updated.");
            return;
        }

        if (res.status === 404) {
            declaredPlan = null;
            statusEl.textContent = "Declaration Status: Not Declared";
            dropdownEl.value = "";

            enableDeclareFeature(true);
            cancelBtn.style.display = "none";
            changeBtn.style.display = "none";
            declareBtn.style.display = "inline-block";
            declareBtn.disabled = true;
            showDialog(`No declared plan found for student with id=${studentId}.`);
            return;
        }

        if (res.status === 409) {
            showDialog("Cannot update the declared plan because it has been cancelled.")
            dropdownEl.value = "";
            return;
        }

        showDialog("There is a problem. Please try again later.");

    } catch (err) {
        console.error("Error changing plan:", err);
        showDialog("There is a problem. Please try again later.");
    }
}

// --------------------------------------------------
// Cancel Declared Plan
// --------------------------------------------------
function confirmCancelDeclaration() {

    if (!declaredPlan) {
        showDialog("No declared plan found.");
        return;
    }

    const planId = declaredPlan.planId || declaredPlan.plan_id;
    const planObj = plansMap[planId] || {};
    const planCode = planObj.planCode || planObj.plan_code || "";
    const planNameEng = planObj.nameEng || planObj.name_eng || planObj.plan_name_eng || "";
    const updatedAtRaw = declaredPlan.updatedAt || declaredPlan.updated_at || declaredPlan.updatedAt;
    const updatedAtFormatted = formatTimeWithTimezone(updatedAtRaw);

    const fullMessage =
        `You have declared ${planCode} - ${planNameEng} as your plan on ${updatedAtFormatted} (${currentTimezone}).` +
        ` Are you sure you want to cancel this declaration?`;
    dialogMsg.textContent = fullMessage;

    dialogCloseBtn.style.display = "none";

    // Show confirm buttons
    dialogConfirmBtn.style.display = "inline-block";
    dialogCancelBtn.style.display = "inline-block";

    dialogEl.showModal();
}

async function actuallyCancelPlan() {
    try {
        const res = await fetch(`${API_PREFIX}/v1/students/${studentId}/declared-plan`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${keycloak.token}` },
        });

        if (res.status === 204 || res.status === 200) {
            declaredPlan = null;

            statusEl.textContent = "Declaration Status: Not Declared";
            enableDeclareFeature(true);
            cancelBtn.style.display = "none";
            changeBtn.style.display = "none";
            dropdownEl.value = ""
            declareBtn.style.display = "inline-block";
            declareBtn.disabled = true;
            showDialog("Declaration cancelled.");
            return;
        }

        if (res.status === 404) {
            declaredPlan = null;
            statusEl.textContent = "Declaration Status: Not Declared";
            enableDeclareFeature(true);
            cancelBtn.style.display = "none";
            changeBtn.style.display = "none";
            declareBtn.style.display = "inline-block";
            declareBtn.disabled = true;
            showDialog(`No declared plan found for student with id=${studentId}.`);
            dropdownEl.value = "";
            return;
        }

        if (res.status === 409) {
            showDialog(`Cannot cancel the declared plan because it is already cancelled.`);
            dropdownEl.value = "";
            return;
        }

         if (res.status === 500) {
        showDialog("There is a problem. Please try again later.");
        await loadDeclarationStatus();
        return;
        }
        showDialog("There is a problem. Please try again later.");
    } catch (err) {
        console.error("Error cancelling plan:", err);
        showDialog("There is a problem. Please try again later.");
    }
}

// --------------------------------------------------
function showDialog(msg) {
    dialogCloseBtn.style.display = "inline-block";
    dialogConfirmBtn.style.display = "none";
    dialogCancelBtn.style.display = "none";
    dialogMsg.textContent = msg;
    dialogEl.showModal();
}