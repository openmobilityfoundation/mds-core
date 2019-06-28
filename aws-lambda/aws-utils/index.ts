import KMS from 'aws-sdk/clients/kms'

// Note: this will require the credentials in .aws/credentials
// to be set. According to the AWS docs, the $AWS_REGION environment
// variable should be set for Lambdas. To get this working locally, you will need to
// export AWS_REGION='us-west-1'
async function decrypt(cipherText: string): Promise<string> {
  const kms = new KMS()
  return new Promise((resolve, reject) => {
    kms.decrypt({ CiphertextBlob: Buffer.from(cipherText, 'base64') }, (err, data) => {
      if (err) {
        reject(err)
      }

      if (!data || !data.Plaintext) {
        reject(Error('no response to decryption attempt'))
      } else {
        resolve(data.Plaintext.toString('ascii'))
      }
    })
  })
}

export { decrypt }
