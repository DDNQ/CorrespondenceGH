import { createServiceContract } from './serviceContractUtils.js'

export const attachmentServiceContract = createServiceContract('attachments', {
  uploadAttachment: {
    params: ['correspondenceId', 'file'],
    returns: 'canonical attachment',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  listAttachments: {
    params: ['correspondenceId'],
    returns: 'canonical attachment[]',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getAttachmentPreviewBlob: {
    params: ['attachment'],
    returns: 'Blob',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
})
