const express = require("express");
const bodyparser = require("body-parser");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
const multer = require("multer");
const csv = require("fast-csv");
const ExcelJS = require("exceljs");

const app = express();
app.use(express.static("./public"));

app.use(bodyparser.json());
app.use(
  bodyparser.urlencoded({
    extended: true,
  }),
);

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mydb",
});

db.connect(function (err) {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to database.");
});

var storage = multer.diskStorage({
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

var upload = multer({
  storage: storage,
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/data", async (req, res) => {
  let template_file_id = req.query.templateFileId;
  let data = await fillDatatoExcel(template_file_id);
  output = {
    data: [],
  };
  console.log(data);
  output.data = data;
  res.send(output);
});

app.post("/import-csv", upload.single("import-csv"), (req, res) => {
  uploadCsv(__dirname + "/uploads/" + req.file.filename);
  console.log("File has imported :" + err);
});
function uploadCsv(uriFile) {
  let stream = fs.createReadStream(uriFile);
  let csvDataColl = [];
  let fileStream = csv
    .parse()
    .on("data", function (data) {
      csvDataColl.push(data);
    })
    .on("end", function () {
      csvDataColl.shift();

      db.connect((error) => {
        if (error) {
          console.error(error);
        } else {
          let createTableQuery = `
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
          db.query(createTableQuery, (error, result) => {
            if (error) {
              console.error("Error creating table:", error);
            } else {
              console.log("Table created successfully");
              let insertQuery =
                "INSERT INTO template (template_id, template_sub_id, template_file_id, form_field_old, form_field_new, auto_increase, input_field, kanri_flg, input_field_name, input_type, refer_input_type, refer_table_name, refer_table_field, option_string, sort, ca, cb, ua, ub, del_flg, def) VALUES ?";
              db.query(insertQuery, [csvDataColl], (error, res) => {
                if (error) {
                  console.error("Error inserting data:", error);
                } else {
                  console.log("Data inserted successfully");
                }
              });
            }
          });
        }
      });

      fs.unlinkSync(uriFile);
    });

  stream.pipe(fileStream);
}

function query(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}
async function fillDatatoExcel(templateFileId) {
  let selectQuery = `SELECT form_field_new,input_field_name FROM mydb.template where template_file_id = "${templateFileId}"`;
  try {
    let data = await query(selectQuery);
    const dataCell = [];

    data.forEach((item) => {
      const formFields = item.form_field_new.split(",");

      formFields.forEach((formField) => {
        let obj = {
          cell: "",
          value: "",
        };
        obj.cell = formField;
        obj.value = item.input_field_name;
        dataCell.push(obj);
      });
    });
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile("uploads/H17_1.xlsx");

    const worksheet = workbook.getWorksheet("Table 1");

    dataCell.forEach((item) => {
      worksheet.getCell(item.cell).value = item.value;
    });
    await workbook.xlsx.writeFile("output/output.xlsx");

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const PORT = process.env.PORT || 5555;
app.listen(PORT, () => console.log(`Node app serving on port: ${PORT}`));
