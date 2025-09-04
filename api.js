// Detta är en Netlify Function
// Den tar emot anrop från din frontend och pratar med Google.

exports.handler = async function(event, context) {
  // Hämta din hemliga Google Script-URL från en säker plats
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

  // Om anropet är GET (hämta data)
  if (event.httpMethod === 'GET') {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const data = await response.json();
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    } catch (error) {
      return { statusCode: 500, body: error.toString() };
    }
  }

  // Om anropet är POST (spara data)
  if (event.httpMethod === 'POST') {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.body
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'success' })
      };
    } catch (error) {
      return { statusCode: 500, body: error.toString() };
    }
  }

  // Om det är en annan metod
  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};