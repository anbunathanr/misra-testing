exports.handler = async (event) => {
  console.log('Register handler called', event);
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    if (!body.email || !body.password || !body.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    return {
      statusCode: 201,
      body: JSON.stringify({ 
        message: 'User registered successfully',
        user: { email: body.email, name: body.name }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
