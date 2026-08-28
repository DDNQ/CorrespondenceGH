export function getRegistrationPresentation({
  currentOfficeName = '',
} = {}) {
  return {
    pageDescription: '',
    routingSectionTitle: 'Dates & Initial Handling',
    routingSectionDescription: '',
    referencePreview: 'Assigned after registration',
    allowsDestinationSelection: false,
    destinationOfficeName: currentOfficeName,
    showsAttachmentInput: true,
    attachmentDescription: 'Attach a document if applicable.',
  }
}
