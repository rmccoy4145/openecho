const fs = require('fs');
const express = require('express');
const filepath = './openapi.json';

// Load in the openapi.json file
console.log(`Loading openapi file: ${filepath}...`);

let jsonData;
try {
    const openapiFile = fs.readFileSync(filepath, 'utf8');
    jsonData = JSON.parse(openapiFile);
} catch (error) {
    console.error('Error reading or parsing JSON', error);
}

// Parse the openapi data to endpoints
// TODO: this needs to be able to handle any url pattern
let baseUrl = jsonData.servers[0].url.split("io").pop();

const app = express();
const PORT = 3000;
app.use(express.json());

for(path in jsonData.paths)
{
    let convertedPath = convertPathParams(path);
    let currentPathObj = jsonData.paths[path];
    let responseExample;

    let fullResourcePath = baseUrl + convertedPath;
    if("get" in currentPathObj)
    {
        console.log(`Constructing Mock Resource -- GET: ${fullResourcePath}`);
        let responseMeta;
        for(response in currentPathObj.get.responses)
        {
            if(response == "200")
            {
                responseMeta = currentPathObj.get.responses[response];
                break; 
            }
        }
        responseExample = getSchemaExample(jsonData, responseMeta?.content?.["application/json"]?.schema?.["$ref"]);

        app.get(fullResourcePath, (req, res) => {
            res.send(responseExample || 'OK');
        });
    }

    if("post" in currentPathObj)
    {
        console.log(`Constructing Mock Resource -- POST: ${fullResourcePath}`);
        let responseMeta;
        for(response in currentPathObj.post.responses)
        {
            if(response == "202" || response == "200")
            {
                responseMeta = currentPathObj.post.responses[response];
                break; 
            }
        }
        responseExample = getSchemaExample(jsonData, responseMeta?.content?.["application/json"]?.schema?.["$ref"]);

        app.get(fullResourcePath, (req, res) => {
            res.send(responseExample || 'ACCEPTED');
        });
    }

    if("delete" in currentPathObj)
    {
        console.log(`Constructing Mock Resource -- DELETE: ${fullResourcePath}`);
        for(response in currentPathObj.delete.responses)
        {
            if(response == "200")
            {
                okResponseMeta = currentPathObj.delete.responses[response];
                break; 
            }
        }

        app.delete(fullResourcePath, (req, res) => {
            res.send(responseExample || 'OK');
        });
    }

}

// Catch-all middleware for handling undefined routes
app.use((req, res) => {
    res.status(404).send('Sorry, this resource is not found!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

function convertPathParams(resourcePath)
{
    return resourcePath.replace(/{(\w+)}/g, ':$1');
}

function getSchemaExample(openapiSpec, ref)
{
    if(ref === undefined)
    {
        return 'N/A';
    }

    let schemaName = ref.split("/").pop();
    return openapiSpec.components.schemas[schemaName].example;
}


