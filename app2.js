const { Pool } = require("pg");
const express = require("express");
const multer = require("multer");
const csv = require("fast-csv");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mydb",
  password: "sonlt0403",
  port: 5432,
});

pool.connect(function (err) {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to database.");
});

const storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, "./uploads/");
  },
  filename: (req, file, callBack) => {
    callBack(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/data", async (req, res) => {
  const template_file_id = req.query.templateFileId;
  const data = await fillDatatoExcel(template_file_id);
  const output = {
    data: [],
  };
  console.log(data);
  output.data = data;
  res.send(output);
});

app.post("/import-csv", upload.single("import-csv"), (req, res) => {
  uploadCsv(__dirname + "/uploads/" + req.file.filename);
  console.log("File has imported");
  res.redirect("/");
});

// async function fillDatatoExcel(templateFileId) {
//   console.log(templateFileId, "------");
//   const selectQuery = `SELECT form_field_new,input_field_name FROM template WHERE template_file_id = $1`;
//   const values = [templateFileId];
//   const { rows } = await pool.query(selectQuery, values);
//   console.log(rows);
//   return rows;
// }

function uploadCsv(uriFile) {
  const stream = fs.createReadStream(uriFile);
  const csvDataColl = [];
  const fileStream = csv
    .parse()
    .on("data", function (data) {
      csvDataColl.push(data);
    })
    .on("end", function () {
      csvDataColl.shift();

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS template (
          template_id VARCHAR(255),
          template_sub_id VARCHAR(255),
          template_file_id VARCHAR(255),
          form_field_old VARCHAR(255),
          form_field_new VARCHAR(255),
          auto_increase VARCHAR(255),
          input_field VARCHAR(255),
          kanri_flg VARCHAR(255),
          input_field_name VARCHAR(255),
          input_type VARCHAR(255),
          refer_input_type VARCHAR(255),
          refer_table_name VARCHAR(255),
          refer_table_field VARCHAR(255),
          option_string VARCHAR(255),
          sort VARCHAR(255),
          ca VARCHAR(255),
          cb VARCHAR(255),
          ua VARCHAR(255),
          ub VARCHAR(255),
          del_flg VARCHAR(3000),
          def VARCHAR(255)
        );
      `;
      pool.query(createTableQuery, (error, result) => {
        if (error) {
          console.error("Error creating table:", error);
        } else {
          console.log("Table created successfully");
          const insertQuery =
            "INSERT INTO template (template_id, template_sub_id, template_file_id, form_field_old, form_field_new, auto_increase, input_field, kanri_flg, input_field_name, input_type, refer_input_type, refer_table_name, refer_table_field, option_string, sort, ca, cb, ua, ub, del_flg, def) VALUES ?";
          pool.query(insertQuery, [csvDataColl], (error, res) => {
            if (error) {
              console.error("Error inserting data:", error);
            } else {
              console.log("Data inserted successfully");
            }
          });
        }
      });

      fs.unlinkSync(uriFile);
    });

  stream.pipe(fileStream);
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
