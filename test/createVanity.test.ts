const { handler } = require('../lambda/createVanity');

describe('createVanityLambda', () => {
  test('returns vanity options prompt when combos exist', async () => {

    const contactFlowEvent = {
      "Details": {
        "ContactData": {
          "Attributes": {
            "Number" : "+19495479473"
          }
        }
      },
    }

    const res = await handler(contactFlowEvent)

    expect(res).toEqual( {"prompt": "<speak>Your vanity number options are <break time=\"500ms\"/><say-as interpret-as=\"telephone\">+1949547</say-as>WIPE<break time=\"500ms\"/><say-as interpret-as=\"telephone\">+1949547</say-as>WIRE<break time=\"500ms\"/><say-as interpret-as=\"telephone\">+1949547</say-as>WISE</speak>"})
  })

  test('returns vanity options prompt when combos exist', async () => {

    const contactFlowEvent = {
      "Details": {
        "ContactData": {
          "Attributes": {
            "Number" : "+19495477949"
          }
        }
      },
    }

    const res = await handler(contactFlowEvent)

    expect(res).toEqual({"prompt": "<speak>There are no vanity numbers available for your phone number</speak>"})
  })
})

// Include test that confirms createVanity lambda write results to dynamo