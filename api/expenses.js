'use strict';

const AWS = require('aws-sdk'); 

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const roll_no = requestBody.roll_no;
  const meal_type = requestBody.meal_type;
  const created_at = requestBody.created_at; // ISO-8601
  const cost = requestBody.cost;

  if (typeof roll_no !== 'string' || typeof meal_type !== 'string' || typeof created_at !== 'string' || typeof cost !== 'number') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit expense due to validation errors.'));
    return;
  }

  addExpense(expense(roll_no, meal_type, created_at, cost))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Expense created successfully',
          roll_no: res.id
        })
      });
    })
    .catch(err => {
      console.log(roll_no, err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Some error occurred while trying to create expense for ${roll_no}`
        })
      })
    });
};

module.exports.fetch = (event, context, callback) => {
  const { roll_no, from, to } = event.pathParameters;

  var date = new Date();
  if (typeof to === "undefined") {
    to = date.toISOString();
  }

  if (typeof from === "undefined") {
    date.setMonth(date.getMonth() - 1);
    from = date.toISOString();
  }

  var params = {
      TableName: process.env.EXPENSES_TABLE,
      Key: {
        roll_no: roll_no
      },
      KeyConditionExpression: '#created_at BETWEEN :from AND :to',
      ExpressionAttributeNames: {
        '#created_at': 'created_at',
      },
      ExpressionAttributeValues: {
        ':from': from,
        ':to': to
      },
  };

  console.log("Fetching expenses");
  dynamoDb.get(params).promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Unable to fetch expenses'));
      return;
    });
};


const addExpense = expense => {
  console.log('Adding expense');
  const expenseItem = {
    TableName: process.env.EXPENSES_TABLE,
    Item: expense,
  };
  return dynamoDb.put(expenseItem).promise()
    .then(res => expense);
};

const expense = (roll_no, meal_type, created_at, cost) => {
  return {
    roll_no: roll_no,
    meal_type: meal_type,
    created_at: created_at,
    updated_at: created_at,
    cost: cost
  };
};