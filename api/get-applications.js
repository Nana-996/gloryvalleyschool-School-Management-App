// Vercel API Route: api/get-applications.js
// Proxies requests to Netlify API to fetch enrollment form submissions
// This replaces the old netlify/functions/get-applications.js which only works on Netlify

const NETLIFY_TOKEN = 'nfp_HT1BdPZrQXFTcwUgSuwgdMwUXfrA7tDL2139';
const SITE_ID = 'fa1a92fd-d713-4adb-9494-e749d8fa01ab';
const FORM_NAME = 'enrollment';

export default async function handler(req, res) {
  // Allow CORS from any origin (needed for browser requests)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Step 1: Get all forms for the Netlify site
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!formsRes.ok) {
      const errText = await formsRes.text();
      return res.status(formsRes.status).json({
        error: `Failed to fetch forms: ${errText}`,
      });
    }

    const forms = await formsRes.json();
    const enrollmentForm = forms.find((f) => f.name === FORM_NAME);

    if (!enrollmentForm) {
      const formNames = forms.map((f) => f.name).join(', ');
      return res.status(404).json({
        error: `Form "${FORM_NAME}" not found. Available forms: [${formNames}]`,
        submissions: [],
      });
    }

    // Step 2: Get all submissions for the enrollment form
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${enrollmentForm.id}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!subRes.ok) {
      const errText = await subRes.text();
      return res.status(subRes.status).json({
        error: `Failed to fetch submissions: ${errText}`,
      });
    }

    const submissions = await subRes.json();
    return res.status(200).json({ submissions });

  } catch (err) {
    return res.status(500).json({
      error: `Server error: ${err.message}`,
    });
  }
}
