const useDocxReportGenerator = require("../engine/template-engine.js");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function template_route(req, res) {
    try {
        const data = req.body;
        const engine = useDocxReportGenerator();
        
        // Await the actual generation step
        const generatedPath = await engine.generate(data);

        res.send(generatedPath);
    } catch (error) {
        console.error("Template generation failed:", error);
        res.status(500).send({ error: error.message });
    }
}

module.exports = template_route;