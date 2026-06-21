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
const warningBanner = document.getElementById("warning-banner");
const downloadBtn = document.getElementById("download-report-btn");
const currencySelect = document.getElementById("currency-select");
let salary = Number(localStorage.getItem("salary")) || 0;

// Load saved transactions from localStorage
const localStorageTransactions = JSON.parse(
  localStorage.getItem("transactions"),
);

// Tracks which transaction is being edited (null)
let editId = null;
let chart;
let currentRate = 1;
let currentSymbol = "₹";

// Use saved transactions
let transactions =
  localStorage.getItem("transactions") !== null ? localStorageTransactions : [];

// ===== CREATE =====

// Generates a random unique ID for a new transaction
function generateID() {
  return Math.floor(Math.random() * 1000000000);
}

//Add Transaction
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

  const amountInINR = Number(amount.value) / currentRate;

  if (editId !== null) {
    transactions = transactions.map((transaction) =>
      transaction.id === editId
        ? {
            ...transaction,
            text: text.value,
            amount: amountInINR,
          }
        : transaction,
    );
    editId = null;
  } else {
    // Creating a brand new transaction
    const transaction = {
      id: generateID(),
      text: text.value,
      amount: amountInINR,
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

  salary = Number(salaryInput.value) / currentRate;

  updateValues();
  updateLocalStorage();

  salaryInput.value = "";
});

// ===== READ =====

//Add Trasactions to DOM list

function addTransactionDOM(transaction) {
  const item = document.createElement("li");

  //Add Class Based on Value
  item.innerHTML = `
    ${transaction.text}<span>
  ${currentSymbol}
  ${(transaction.amount * currentRate).toFixed(2)}
</span>
    <button onclick="editTransaction(${transaction.id})">Edit</button>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
  `;

  list.appendChild(item);
}

function updateValues() {
  const amounts = transactions.map((transaction) => transaction.amount);

  const totalExpenses = amounts.reduce((acc, item) => acc + item, 0);

  const remainingBalance = salary - totalExpenses;

  const threshold = salary * 0.1;

  if (salary > 0 && remainingBalance < threshold) {
    balance.style.color = "red";

    warningBanner.style.display = "block";
  } else {
    balance.style.color = "";

    warningBanner.style.display = "none";
  }

  balance.innerText = `${currentSymbol}${(remainingBalance * currentRate).toFixed(2)}`;

  money_plus.innerText = `${currentSymbol}${(salary * currentRate).toFixed(2)}`;

  money_minus.innerText = `${currentSymbol}${(totalExpenses * currentRate).toFixed(2)}`;

  updateChart(remainingBalance * currentRate, totalExpenses * currentRate);
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

function Init() {
  list.innerHTML = "";

  transactions.forEach(addTransactionDOM);
  updateValues();
}

Init();

// ===== UPDATE =====

// Edit Expense
function editTransaction(id) {
  const transaction = transactions.find((transaction) => transaction.id === id);

  text.value = transaction.text;
  amount.value = (transaction.amount * currentRate).toFixed(2);

  editId = id; // addTransaction() will now UPDATE this transaction instead of creating a new one
}

// ===== DELETE =====

//Remove Transaction by ID
function removeTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  updateLocalStorage();
  Init();
}

//update Local Storage Transaction
function updateLocalStorage() {
  localStorage.setItem("salary", salary);
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Download Expense Report
downloadBtn.addEventListener("click", downloadReport);
function downloadReport() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Cash Flow Report", 20, 20);

  doc.setFontSize(12);

  const convertedSalary = salary * currentRate;
  doc.text(`Salary: ${currentSymbol}${convertedSalary.toFixed(2)}`, 20, 40);

  const totalExpenses = transactions.reduce(
    (acc, transaction) => acc + transaction.amount,
    0,
  );

  const remainingBalance = salary - totalExpenses;
  const convertedExpenses = totalExpenses * currentRate;
  const convertedBalance = remainingBalance * currentRate;

  doc.text(
    `Total Expenses: ${currentSymbol}${convertedExpenses.toFixed(2)}`,
    20,
    50,
  );

  doc.text(
    `Remaining Balance: ${currentSymbol}${convertedBalance.toFixed(2)}`,
    20,
    60,
  );

  doc.text("Expenses:", 20, 80);

  let y = 90;

  transactions.forEach((transaction, index) => {
    const convertedAmount = transaction.amount * currentRate;
    doc.text(
      `${index + 1}. ${transaction.text} - ${currentSymbol}${convertedAmount.toFixed(2)}`,
      20,
      y,
    );

    y += 10;
  });

  doc.save("CashFlowExpenseReport.pdf");
}

// Currency Converter
currencySelect.addEventListener("change", convertCurrency);

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

async function convertCurrency() {
  const selectedCurrency = currencySelect.value;

  currentSymbol = currencySymbols[selectedCurrency] || selectedCurrency;

  if (selectedCurrency === "INR") {
    currentRate = 1;
    Init();
    return;
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/INR/${selectedCurrency}`,
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log(data);

    currentRate = data.rate;

    Init();
  } catch (error) {
    console.error(error);
    alert("Currency conversion failed");
  }
}
