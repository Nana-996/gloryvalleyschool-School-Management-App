const NETLIFY_TOKEN = 'nfp_HT1BdPZrQXFTcwUgSuwgdMwUXfrA7tDL2139';
const SITE_ID = 'fa1a92fd-d713-4adb-9494-e749d8fa01ab';
const FORM_NAME = 'enrollment';

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Step 1: Get all forms for the site
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
      return {
        statusCode: formsRes.status,
        headers,
        body: JSON.stringify({ error: `Failed to fetch forms: ${errText}` }),
      };
    }

    const forms = await formsRes.json();
    const enrollmentForm = forms.find((f) => f.name === FORM_NAME);

    if (!enrollmentForm) {
      const formNames = forms.map((f) => f.name).join(', ');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: `Form "${FORM_NAME}" not found. Available forms: [${formNames}]`,
          submissions: [],
        }),
      };
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
      return {
        statusCode: subRes.status,
        headers,
        body: JSON.stringify({ error: `Failed to fetch submissions: ${errText}` }),
      };
    }

    const submissions = await subRes.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ submissions }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Server error: ${err.message}` }),
    };
  }
};
