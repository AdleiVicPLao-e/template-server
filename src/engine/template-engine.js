const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

function buildTemplateData(payload = {}) {
    const workflowMetadata = payload.workflowMetadata || {};
    const inputDates = workflowMetadata.inputDates || {};
    
    const firstDefined = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '') || '';
    const toText = (val) => (typeof val === 'object' ? '' : String(val).trim());

    const claimantName = toText(firstDefined(payload.claimantName, payload.claimant, payload.insuredName, payload.insured));
    const date = toText(firstDefined(payload.date, payload.reportDate, payload.report_date, new Date().toLocaleDateString()));

    return {
        // Core Bracket Replacements (Safely quoted keys)
        "Insert Date": date,
        "Date Assignment Received": toText(firstDefined(payload.assignmentDate, inputDates.documentsReceivedAt, date)),
        "Insert Client Name": toText(firstDefined(payload.insurer, "Insurance Client")),
        "Insert Client Address": toText(firstDefined(payload.clientAddress, "Client Address")),
        "Insert Title/Position": toText(firstDefined(payload.attentionTitle, "Claims Department")),
        "Insert": toText(firstDefined(payload.lossType, payload.peril, "Typhoon/Flood")),
        "Insert Insured Name": toText(firstDefined(payload.insuredName, payload.insured, claimantName)),
        "Name of Insured": toText(firstDefined(payload.insuredName, payload.insured, claimantName)),
        "Insurer Name": toText(firstDefined(payload.insurer, "Insurer")),
        "Insert Location": toText(firstDefined(payload.locationOfRisk, "Location of Risk")),
        "Location of Risk": toText(firstDefined(payload.locationOfRisk, "Location of Risk")),
        "Insert Policy Number": toText(firstDefined(payload.policyNumber, "N/A")),
        "Insert Principal/Claims Department/Loss Manager Name": toText(firstDefined(payload.claimsManager, "Claims Department")),
        "Insert Contact Person or Representative’s Name": toText(firstDefined(payload.contactPerson, "the Representative")),
        "Insert Property Address": toText(firstDefined(payload.locationOfRisk, "Property Address")),
        "Insert Date of Site Attendance": toText(firstDefined(payload.siteAttendanceDate, inputDates.inspectionCompletedDate, date)),
        "Insert Name": toText(firstDefined(payload.typhoonName, "Typhoon")),
        "Insert km/h or mph": toText(firstDefined(payload.windSpeed, "N/A")),
        "Insert Wind Signal No., e.g., Signal No. 3": toText(firstDefined(payload.windSignal, "N/A")),
        "Insert flood level, e.g., 1.5 meters": toText(firstDefined(payload.floodLevel, "N/A")),
        "___________": toText(firstDefined(payload.lossReserveAmount, "0.00")),
        
        // Blank Line Target Keys
        "referenceNumber": toText(firstDefined(payload.referenceNumber, "PENDING")),
        "claimNumber": toText(firstDefined(payload.claimNumber, payload.claim_number, 'Please Advise')),
        "attentionPerson": toText(firstDefined(payload.attentionPerson, "Sir/Madam")),
        "preparedByName": toText(firstDefined(payload.preparedByName, 'NOVA System Automation')),
        "preparedByTitle": toText(firstDefined(payload.preparedByTitle, 'Claims Processor'))
    };
}

function useDocxReportGenerator() {
    const generate = async (payload, fileName = `NOVA-report-${Date.now()}.docx`) => {
        const templatePath = path.join(process.cwd(), "public", "docx", "TCS_Advance-Report_Typhoon_Flood_Template_-20250730.docx");
        
        let content = fs.readFileSync(templatePath, "binary");
        
        // --- AUTO-CONVERSION LAYER (Brackets) ---
        content = content.replace(/\[Insert Date\]/g, "{Insert Date}");
        content = content.replace(/\[Date Assignment Received\]/g, "{Date Assignment Received}");
        content = content.replace(/\[Insert Client Name\]/g, "{Insert Client Name}");
        content = content.replace(/\[Insert Client Address\]/g, "{Insert Client Address}");
        content = content.replace(/\[Insert Title\/Position\]/g, "{Insert Title/Position}");
        content = content.replace(/\[Insert\]/g, "{Insert}");
        content = content.replace(/\[Insert Insured Name\]/g, "{Insert Insured Name}");
        content = content.replace(/\[Name of Insured\]/g, "{Name of Insured}");
        content = content.replace(/\[Insurer Name\]/g, "{Insurer Name}");
        content = content.replace(/\[Insert Location\]/g, "{Insert Location}");
        content = content.replace(/\[Location of Risk\]/g, "{Location of Risk}");
        content = content.replace(/\[Insert Policy Number\]/g, "{Insert Policy Number}");
        content = content.replace(/\[Insert Principal\/Claims Department\/Loss Manager Name\]/g, "{Insert Principal/Claims Department/Loss Manager Name}");
        content = content.replace(/\[Insert Contact Person or Representative’s Name\]/g, "{Insert Contact Person or Representative’s Name}");
        content = content.replace(/\[Insert Property Address\]/g, "{Insert Property Address}");
        content = content.replace(/\[Insert Date of Site Attendance\]/g, "{Insert Date of Site Attendance}");
        content = content.replace(/\[Insert Name\]/g, "{Insert Name}");
        content = content.replace(/\[Insert km\/h or mph\]/g, "{Insert km/h or mph}");
        content = content.replace(/\[Insert Wind Signal No\., e.g\., Signal No\. 3\]/g, "{Insert Wind Signal No., e.g., Signal No. 3}");
        content = content.replace(/\[Insert flood level, e.g\., 1.5 meters\]/g, "{Insert flood level, e.g., 1.5 meters}");
        content = content.replace(/PHP ___________/g, "PHP {___________}");
        content = content.replace(/Please Advise/g, "{claimNumber}");
        
        // --- BLANK LINES TARGETING ---
        content = content.replace(/TCS\/2025\/________/g, "TCS/2025/{referenceNumber}");
        content = content.replace(/MS\.\/MR\s+__________________/g, "{attentionPerson}");
        content = content.replace(/Gentlemen\/Ms\.\/Mr\.\s+________________:/g, "Dear {attentionPerson}:");
        
        // Signatures
        content = content.replace(/\[Insert Name\]/g, "{preparedByName}");
        content = content.replace(/\[Insert Title\/Position\]/g, "{preparedByTitle}");

        // --- COMPILATION LAYER ---
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const templateData = buildTemplateData(payload);
        doc.render(templateData);

        const buf = doc.getZip().generate({ type: "nodebuffer" });

        const outputDir = path.join(process.cwd(), "public", "generated");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, buf);

        return path.join("public", "generated", fileName);
    };

    return { generate };
}

module.exports = useDocxReportGenerator;