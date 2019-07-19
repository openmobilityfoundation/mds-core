import KMS from 'aws-sdk/clients/kms'

// Note: this will require the credentials in .aws/credentials
// to be set. According to the AWS docs, the $AWS_REGION environment
// variable should be set for Lambdas. To get this working locally, you will need to
// export AWS_REGION='us-west-1'
async function decrypt(cipherText: string): Promise<string> {
  try {
    const kms = new KMS()
    const data = await kms.decrypt({ CiphertextBlob: Buffer.from(cipherText, 'base64') }).promise()

    if (!data || !data.Plaintext) {
      throw new Error('no response to decryption attempt')
    } else {
      return data.Plaintext.toString('ascii')
    }
  } catch (err) {
    throw err
  }
}

export { decrypt }
