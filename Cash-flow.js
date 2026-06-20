// ===== SETUP: DOM elements & initial state =====
const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const salaryInput = document.getElementById("salary-input");
const salaryForm = document.getElementById("salary-form");
let salary = Number(localStorage.getItem("salary")) || 0;

// Load saved transactions from localStorage
const localStorageTransactions = JSON.parse(
  localStorage.getItem("transactions"),
);

// Tracks which transaction is being edited (null = adding new)
let editId = null;
let chart;

// Use saved transactions if they exist, otherwise start with empty array
let transactions =
  localStorage.getItem("transactions") !== null ? localStorageTransactions : [];

// ===== CREATE =====

// Generates a random unique ID for a new transaction
function generateID() {
  return Math.floor(Math.random() * 1000000000);
}

//Add Transaction
// Handles both adding a NEW transaction and saving changes when EDITING (editId !== null)
function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Please fill all fields");
    return;
  }

  if (Number(amount.value) <= 0) {
    alert("Expense amount must be greater than 0");
    return;
  }

  if (editId !== null) {
    // Editing existing transaction: replace it with updated values
    transactions = transactions.map((transaction) =>
      transaction.id === editId
        ? {
            ...transaction,
            text: text.value,
            amount: Number(amount.value),
          }
        : transaction,
    );
    editId = null;
  } else {
    // Creating a brand new transaction
    const transaction = {
      id: generateID(),
      text: text.value,
      amount: Number(amount.value),
    };

    transactions.push(transaction);
  }

  updateLocalStorage();
  Init();

  text.value = "";
  amount.value = "";
}

// Trigger addTransaction when the form is submitted
form.addEventListener("submit", addTransaction);

// Set/Create the salary value
salaryForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (Number(salaryInput.value) <= 0) {
    alert("Please enter a valid salary");
    return;
  }
  salary = Number(salaryInput.value);

  money_plus.innerText = `₹${salary}`;

  updateValues();
  updateLocalStorage();

  salaryInput.value = "";
});

// ===== READ =====

//Add Trasactions to DOM list
// Renders a single transaction as a list item on the page
function addTransactionDOM(transaction) {
  const item = document.createElement("li");

  //Add Class Based on Value
  item.innerHTML = `
    ${transaction.text}<span>₹${transaction.amount}</span>
    <button onclick="editTransaction(${transaction.id})">Edit</button>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
  `;

  list.appendChild(item);
}

//Update the balance income and expence
// Reads all transactions and recalculates balance, income, expense totals on screen
function updateValues() {
  const amounts = transactions.map((transaction) => transaction.amount);

  const totalExpenses = amounts.reduce((acc, item) => acc + item, 0);

  const remainingBalance = salary - totalExpenses;

  balance.innerText = `₹${remainingBalance.toFixed(2)}`;
  money_plus.innerText = `₹${salary.toFixed(2)}`;
  money_minus.innerText = `₹${-totalExpenses.toFixed(2)}`;
  updateChart(remainingBalance, totalExpenses);
}

// Update the Chart
function updateChart(remainingBalance, totalExpenses) {
  if (chart) {
    chart.destroy();
  }

  const ctx = document.getElementById("expenseChart").getContext("2d");

  chart = new Chart(ctx, {
    type: "pie",

    data: {
      labels: ["Remaining Balance", "Expenses"],

      datasets: [
        {
          data: [remainingBalance, totalExpenses],
        },
      ],
    },
  });
}

// Reads transactions from memory and rebuilds the entire list + totals on screen
function Init() {
  list.innerHTML = "";

  transactions.forEach(addTransactionDOM);
  updateValues();
}

// Run once on page load to display saved data
Init();

// ===== UPDATE =====

// Edit Expense
// Fills the form with the selected transaction's data so the user can edit it
function editTransaction(id) {
  const transaction = transactions.find((transaction) => transaction.id === id);

  text.value = transaction.text;
  amount.value = transaction.amount;

  editId = id; // addTransaction() will now UPDATE this transaction instead of creating a new one
}

// ===== DELETE =====

//Remove Transaction by ID
// Removes a transaction from the list and refreshes the screen
function removeTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  updateLocalStorage();
  Init();
}

//update Local Storage Transaction
// Saves the current salary and transactions list into the browser's localStorage
function updateLocalStorage() {
  localStorage.setItem("salary", salary);
  localStorage.setItem("transactions", JSON.stringify(transactions));
}
