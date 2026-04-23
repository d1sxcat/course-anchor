import { S3Client, PutObjectCommand, GetObjectCommand, S3ServiceException } from '@aws-sdk/client-s3'
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { type FileUpload } from '@mjackson/form-data-parser'
import { createId } from '@paralleldrive/cuid2'

const STORAGE_BUCKET = process.env.BUCKET_NAME
const STORAGE_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
const STORAGE_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY
const STORAGE_REGION = process.env.AWS_REGION

const client = new S3Client({ region: STORAGE_REGION, credentials: { accessKeyId: STORAGE_ACCESS_KEY, secretAccessKey: STORAGE_SECRET_KEY } })

async function uploadToStorage(file: File | FileUpload, key: string) {

	const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
		ContentType: file.type,
  });

	const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })

	const uploadResponse = await fetch(presignedUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': file.type,
			"Content-Length": String(file.size)
		},
		body: file instanceof File ? file : (file as FileUpload).stream(),
	})
	if (!uploadResponse.ok) {
		throw new Error(`Failed to upload file with status ${uploadResponse.status}`)
	}
	return key

  // try {
  //   await client.send(command);
  //   return key
  // } catch (caught) {
  //   if (
  //     caught instanceof S3ServiceException &&
  //     caught.name === "EntityTooLarge"
  //   ) {
  //     throw new Error(
  //       `The file:${key} was too large. Max allowed size is 5GB.`,
  //     );
  //   } else if (caught instanceof S3ServiceException) {
  //     throw new Error(
  //       `Error while uploading file:${key}.  ${caught.name}: ${caught.message}`,
  //     );
  //   } else {
  //     throw caught;
  //   }
  // }
}

export async function uploadProfileImage(
	userId: string,
	file: File | FileUpload,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `users/${userId}/profile-images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key)
}

export async function uploadNoteImage(
	userId: string,
	noteId: string,
	file: File | FileUpload,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `users/${userId}/notes/${noteId}/images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key)
}

// function hmacSha256(key: string | Buffer, message: string) {
// 	const hmac = createHmac('sha256', key)
// 	hmac.update(message)
// 	return hmac.digest()
// }

// function sha256(message: string) {
// 	const hash = createHash('sha256')
// 	hash.update(message)
// 	return hash.digest('hex')
// }

// function getSignatureKey(
// 	key: string,
// 	dateStamp: string,
// 	regionName: string,
// 	serviceName: string,
// ) {
// 	const kDate = hmacSha256(`AWS4${key}`, dateStamp)
// 	const kRegion = hmacSha256(kDate, regionName)
// 	const kService = hmacSha256(kRegion, serviceName)
// 	const kSigning = hmacSha256(kService, 'aws4_request')
// 	return kSigning
// }

// function getBaseSignedRequestInfo({
// 	method,
// 	key,
// 	contentType,
// 	uploadDate,
// }: {
// 	method: 'GET' | 'PUT'
// 	key: string
// 	contentType?: string
// 	uploadDate?: string
// }) {
// 	const url = `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${key}`
// 	const endpoint = new URL(url)

// 	// Prepare date strings
// 	const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
// 	const dateStamp = amzDate.slice(0, 8)

// 	// Build headers array conditionally
// 	const headers = [
// 		...(contentType ? [`content-type:${contentType}`] : []),
// 		`host:${endpoint.host}`,
// 		`x-amz-content-sha256:UNSIGNED-PAYLOAD`,
// 		`x-amz-date:${amzDate}`,
// 		...(uploadDate ? [`x-amz-meta-upload-date:${uploadDate}`] : []),
// 	]

// 	const canonicalHeaders = headers.join('\n') + '\n'
// 	const signedHeaders = headers.map((h) => h.split(':')[0]).join(';')

// 	const canonicalRequest = [
// 		method,
// 		`/${STORAGE_BUCKET}/${key}`,
// 		'', // canonicalQueryString
// 		canonicalHeaders,
// 		signedHeaders,
// 		'UNSIGNED-PAYLOAD',
// 	].join('\n')

// 	// Prepare string to sign
// 	const algorithm = 'AWS4-HMAC-SHA256'
// 	const credentialScope = `${dateStamp}/${STORAGE_REGION}/s3/aws4_request`
// 	const stringToSign = [
// 		algorithm,
// 		amzDate,
// 		credentialScope,
// 		sha256(canonicalRequest),
// 	].join('\n')

// 	// Calculate signature
// 	const signingKey = getSignatureKey(
// 		STORAGE_SECRET_KEY,
// 		dateStamp,
// 		STORAGE_REGION,
// 		's3',
// 	)
// 	const signature = createHmac('sha256', signingKey)
// 		.update(stringToSign)
// 		.digest('hex')

// 	const baseHeaders = {
// 		'X-Amz-Date': amzDate,
// 		'X-Amz-Content-SHA256': 'UNSIGNED-PAYLOAD',
// 		Authorization: [
// 			`${algorithm} Credential=${STORAGE_ACCESS_KEY}/${credentialScope}`,
// 			`SignedHeaders=${signedHeaders}`,
// 			`Signature=${signature}`,
// 		].join(', '),
// 	}

// 	return { url, baseHeaders }
// }

// async function getSignedPutRequestInfo(file: File | FileUpload, key: string) {
// 	const command = new PutObjectCommand({
// 		Bucket: STORAGE_BUCKET,
// 		Key: key,
// 		ContentType: file.type,
// 		//Body: file instanceof File ? file : (file as FileUpload).stream(),
// 	})
// 	const url = await getSignedUrl(client, command, { expiresIn: 3600 });

// 	return {
// 		url
// 	}
// }

export async function getSignedGetRequestInfo(key: string) {
	const command = new GetObjectCommand({
		Bucket: STORAGE_BUCKET,
		Key: key,
	})
	const url = await getSignedUrl(client, command, { expiresIn: 3600 })

	return {
		url
	}
}