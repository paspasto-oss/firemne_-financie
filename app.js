// === Firemné financie – Fixné náklady blok ===

// uložené v localStorage ako fixneNaklady
const FIXNE_KEY = "fixneNaklady";
let fixneData = JSON.parse(localStorage.getItem(FIXNE_KEY)) || [];

// načítanie a vykreslenie
function renderFixneNaklady() {
  const container = document.getElementById("fixne-naklady-block");
  container.innerHTML = `
    <h2>Fixné náklady</h2>
    <table>
      <thead>
        <tr>
          <th>Názov</th>
          <th>Suma (€)</th>
          <th>Poznámka</th>
          <th>Akcia</th>
        </tr>
      </thead>
      <tbody>
        ${fixneData.map((item, i) => `
          <tr>
            <td><input value="${item.name}" onchange="updateFixne(${i}, 'name', this.value)" /></td>
            <td><input type="number" value="${item.amount}" onchange="updateFixne(${i}, 'amount', this.value)" /></td>
            <td><input value="${item.note}" onchange="updateFixne(${i}, 'note', this.value)" /></td>
            <td><button onclick="removeFixne(${i})" class="secondary">Zmazať</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <button onclick="addFixne()">+ Pridať fixný náklad</button>
    <button onclick="vlozitDoTabulky()">Preniesť do výdavkov mesiaca</button>
  `;
}

// pridať nový riadok
function addFixne() {
  fixneData.push({ name: "", amount: 0, note: "" });
  saveFixne();
}

// upraviť hodnotu
function updateFixne(i, key, val) {
  fixneData[i][key] = key === "amount" ? parseFloat(val) || 0 : val;
  saveFixne();
}

// zmazať riadok
function removeFixne(i) {
  fixneData.splice(i, 1);
  saveFixne();
}

// uloženie do localStorage
function saveFixne() {
  localStorage.setItem(FIXNE_KEY, JSON.stringify(fixneData));
  renderFixneNaklady();
}

// preniesť do hlavnej tabuľky
function vlozitDoTabulky() {
  alert("Prenos do mesačnej tabuľky sa pridá po prepojení s hlavným modulom.");
}

window.onload = () => renderFixneNaklady();
