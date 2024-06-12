const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const AWS = require("aws-sdk");
const mysql = require("mysql2");

const app = express();
const PORT = 3004;

AWS.config.update({
  accessKeyId: "",
  secretAccessKey: "",
  region: "",
});

const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const secretManager = new AWS.SecretsManager();

let db = createDatabase();

app.use(express.json());

app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.get("/cep", async (req, res) => {
  try {
    const relationalConnection = await connectWithRelationalDatabase();
    const dados = await getCeps(relationalConnection);
    res.json(dados);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao consultar dados do banco de dados" });
  }
});

app.post("/cep", async (req, res) => {
  try {
    const body = {
      cep_number: req.body.cep_number,
    };

    await postCep(body);

    await sendToSqs(body);

    res.status(200).json({ message: "O cep foi cadastrado com sucesso!!!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao consultar dados do banco de dados" });
  }
});

app.get("/", (req, res) => {
  res.send("House Teste 1");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

async function getCeps(relationalConnection) {
  try {
    const selectTableSql = `SELECT * FROM cep_table`;
    const dbLoaded = await db;

    const collection = dbLoaded.collection("cep");

    console.log(await collection.find().toArray(), "COLEÇÃO DO CEP DOCUMENTDB");

    const ceps = await new Promise((resolve, reject) => {
      relationalConnection.query(selectTableSql, (err, result) => {
        if (err) {
          console.error("Erro ao inserir dados:", err);
          reject(err);
        }
        console.log("Dados adquiridos com sucesso.", result);
        resolve(result);
      });
    });

    console.log(ceps, "COLEÇÃO DO CEP AURORA");
    return { cepFound: ceps, cepCached: await collection.find().toArray() };
  } catch (e) {
    console.log("Erro ao fazer um get", e);
  }
}

async function postCep(body) {
  try {
    const dbLoaded = await db;

    const collection = dbLoaded.collection("cep");

    await collection.insertOne(body);
  } catch (error) {
    console.error("Erro ao cadastrar valor:", error);
  }
}

async function sendToSqs(body) {
  const bodyStringfy = JSON.stringify(body);

  const params = {
    MessageBody: bodyStringfy,
    QueueUrl: "",
  };
  console.log("to aqui veii", bodyStringfy);

  sqs.sendMessage(params, (err, data) => {
    if (err) {
      console.log("Erro ao enviar mensagem para a fila:", err);
    } else {
      console.log(data, "DATA");
      console.log("Mensagem enviada com sucesso:", data.MessageId);
    }
  });
}

async function createDatabase() {
  const COLLECTION_NAME = "cep";
  const secretManagerData = await secretManager
    .getSecretValue({ SecretId: "" })
    .promise();

  const secretManagerValue = JSON.parse(secretManagerData.SecretString);

  const documentDbUserCredentials = secretManagerValue.documentDb.user1;

  const client = new MongoClient(``, { useUnifiedTopology: true });
  try {
    await client.connect();

    const db = await client.db("");

    const collections = await db.listCollections().toArray();

    const collectionExist = collections.some(
      (collection) => collection.name === COLLECTION_NAME
    );

    if (!collectionExist) db.createCollection(COLLECTION_NAME);

    console.log(collectionExist, "COLEÇÃO EXISTE?");

    return db;
  } catch (error) {
    console.error("Erro ao criar banco de dados e coleção:", error);
  }
}

async function connectWithRelationalDatabase() {
  try {
    const secretManagerData = await secretManager
      .getSecretValue({ SecretId: "" })
      .promise();

    const secretManagerValue = JSON.parse(secretManagerData.SecretString);

    const rdsUserCredentials = secretManagerValue.rds.user1;

    var connection = await mysql.createConnection({
      host: "",
      user: rdsUserCredentials.username,
      password: rdsUserCredentials.password,
      database: "",
      port: 3306,
    });

    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error("Erro ao conectar ao banco de dados:", err);
          reject(err);
        }
        resolve("conexão bem feita");
        console.log("Conexão bem-sucedida ao banco de dados!");
      });
    });

    return connection;
  } catch (e) {
    throw e;
  }
}
