// Imports and server creation
const pg = require("pg");
const express = require("express");
const app = express();
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory"
);

// Middleware
app.use(express.json());

app.use(require("morgan")("dev"));

// Routes
// GET /api/employees: Returns array of employees.
app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
    SELECT * FROM employees;
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/departments: Returns an array of departments.
app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
    SELECT * FROM departments;
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/employees: Returns a created employee. The payload is the employee to create.
app.post("/api/employees", async (req, res, next) => {
  try {
    // If there is no name or no department_id an an error with a status of 400 (bad request on the client side) will be shown
    if (!req.body.name || !req.body.department_id) {
      return res.status(400).json({
        error: "name and department_id are required",
      });
    }
    const SQL = `
    INSERT INTO employees(name, department_id)
    VALUES($1, $2)
    RETURNING *;
    `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/employees/:id: Returns an updated employee. The payload is the employee to update.
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    // If there is no name or no department_id an an error with a status of 400 (bad request on the client side) will be shown
    if (!req.body.name || !req.body.department_id) {
      return res.status(400).json({
        error: "name and department_id are required",
      });
    }
    const SQL = `
    UPDATE employees
    SET name=$1, department_id=$2, updated_at= now()
    WHERE id=$3
    RETURNING *;
    `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    // If there are no employees found a 404 error will be shown
    if (response.rows.length === 0) {
      return res.status(404).json({
        error: "Employee not found",
      });
    }
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/employees/:id: Returns nothing. The ID of the employee to delete is passed in the URL.
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
    DELETE FROM employees
    WHERE id =$1;
    `;
    const response = await client.query(SQL, [req.params.id]);
    // If there are no employees found a 404 error will be shown
    if (response.rowCount === 0) {
      return res.status(404).json({
        error: "Employee not found!",
      });
    }
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// Initialization
const init = async () => {
  await client.connect();
  // Create the 'departments' and the 'employees' tables
  let SQL = `
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS departments;

  CREATE TABLE departments(
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
  );
  CREATE TABLE employees(
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  department_id INTEGER REFERENCES departments(id) NOT NULL
  );
  `;
  await client.query(SQL);
  console.log("tables created");

  // Seed the tables with data
  SQL = `
  INSERT INTO departments(name) VALUES('HTML');
  INSERT INTO departments(name) VALUES('CSS');
  INSERT INTO departments(name) VALUES('Javascript');

  INSERT INTO employees(name, department_id)
  VALUES('Employee 1',(SELECT id FROM departments WHERE name='HTML'));
  INSERT INTO employees(name, department_id)
  VALUES('Employee 2',(SELECT id FROM departments WHERE name='CSS'));
  INSERT INTO employees(name, department_id)
  VALUES('Employee 3',(SELECT id FROM departments WHERE name='Javascript'));
  INSERT INTO employees(name, department_id)
  VALUES('Employee 4',(SELECT id FROM departments WHERE name='Javascript'));
  `;
  await client.query(SQL);
  console.log("data seeded");

  // Have the express server listen
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
};

init();
