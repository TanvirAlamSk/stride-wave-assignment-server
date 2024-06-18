const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = 5000

app.use(cors())
app.use(express.json())



console.log(process.env.DB_NAME)
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.7xhaxuz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const createToken = (email) => {
    const token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: "2 days" })
    return token;
}

const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send("Unauthorized Access")
    }
    const authorization = req.headers.authorization.split(" ")[1]
    jwt.verify(authorization, process.env.SECRET_KEY, function (error, decoded) {
        if (error) {
            return res.status(403).send("Forbidden Access")
        }
        req.decoded = decoded
        next()
    });
}

async function run() {
    try {
        await client.connect();
        const recipes = await client.db("recipe-easy").collection("recipes")
        const users = client.db("recipe-easy").collection("users")

        app.get("/recipes", async (req, res) => {
            const query = {}
            const result = await recipes.find(query).toArray()
            res.send(result)
        })

        app.post("/recipes", verifyToken, async (req, res) => {
            const data = req.body
            const result = await recipes.insertOne(data)
            res.send(result)
        })

        app.get("/recipes/:id", verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await recipes.findOne(query)
            res.send(result)
        })

        app.patch("/recipes/:id", verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const option = { upsert: true }
            const updatedDoc = {
                $set: req.body
            }
            const result = await recipes.updateOne(query, updatedDoc, option)
            res.send(result)
        })

        app.delete("/recipes/:id", verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await recipes.deleteOne(query)
            res.send(result)
        })


        // only login user
        app.get("/users", async (req, res) => {
            const email = req.query.email
            // if (email !== req.decoded.email) {
            //     return res.status(403).send("Forbidden Access")
            // }
            // verifyToken,
            const query = { email: email }
            const result = await users.findOne(query)
            res.send(result)
        })

        app.post("/users", async (req, res) => {
            const data = req.body
            const query = { email: data.email }
            const isExists = await users.findOne(query)
            const token = createToken(data.email)

            if (!isExists) {
                const result = await users.insertOne(data)
                return res.send({ result, token })
            } else {
                return res.send({ token })
            }

        })

        app.patch("/users", async (req, res) => {
            const filter = { email: req.query.email }
            const updatedDoc = {
                $set: req.body
            }
            const options = { upsert: true }
            const result = await users.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

    } finally {

    }
}

run().catch((error) => console.log(error))

app.get("/", (req, res) => {
    res.send("Server is Running")
})

app.listen(port, () => {
    console.log("Server is running on Port 5000")
})