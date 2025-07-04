-- Table: loans
CREATE TABLE loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  father_name VARCHAR(50),
  location VARCHAR(100),
  amount INT NOT NULL,
  category_type ENUM('Gold', 'Silver') NOT NULL,
  detailed_type VARCHAR(50),         -- e.g., "22K Necklace"
  weight DECIMAL(10,3),
  issue_date DATE NOT NULL,
  status ENUM('active', 'closed') DEFAULT 'active',
  closed_date DATE,
  interest int
);

-- Table: deposits
CREATE TABLE deposits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  amount INT NOT NULL,
  deposit_date DATE NOT NULL,
  FOREIGN KEY (loan_id) REFERENCES loans(id)
);

-- Table: fingerprints (active loans only)
CREATE TABLE fingerprints (
  loan_id INT PRIMARY KEY,
  iso_template LONGTEXT,
  bitmap_data LONGTEXT,
  FOREIGN KEY (loan_id) REFERENCES loans(id)
);

-- Table: removed_fingerprints (closed loans only)
CREATE TABLE removed_fingerprints (
  loan_id INT PRIMARY KEY,
  iso_template LONGTEXT,
  bitmap_data LONGTEXT,
  FOREIGN KEY (loan_id) REFERENCES loans(id)
);

-- Table: daily_cash_summary
CREATE TABLE daily_cash_summary (
  date DATE PRIMARY KEY,
  Investments DOUBLE,
  Returns DOUBLE,
  total_cash DOUBLE,
  added_cash DOUBLE,
  removed_cash DOUBLE,
  deposit_credit DOUBLE,
  deposit_debit DOUBLE,
  left_cash DOUBLE
);

CREATE TABLE cash_transactions (
    transaction_date DATE NOT NULL ,
    type ENUM('add', 'remove') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL
);