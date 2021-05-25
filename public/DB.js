let db;
let budgetVersion;

const request = indexedDB.open('BudgetDB', budgetVersion || 21);

request.onupgradeneeded = function (e) {
  const { oldVersion } = e;
  const newV = e.newV || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newV}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('BudgetTracker', { autoIncrement: true });
  }
};

request.onerror = function (e) {
  console.log(`Error! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log('check db invoked');

  let transaction = db.transaction(['BudgetTracker'], 'readwrite');

  const store = transaction.objectStore('BudgetTracker');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If returned response is not empty
          if (res.length !== 0) {
            // Open another transaction with ability to read and write
            transaction = db.transaction(['BudgetTracker'], 'readwrite');

            // Assign current store to a variable
            const currentTransaction = transaction.objectStore('BudgetTracker');

            // Clear existing entries because bulk add was successful
            currentTransaction.clear();
            console.log('Clearing tracker');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online!');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save invoked');
  const transaction = db.transaction(['BudgetTracker'], 'readwrite');

  // Access BudgetTracker object store
  const store = transaction.objectStore('BudgetTracker');

  // Add record to store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);