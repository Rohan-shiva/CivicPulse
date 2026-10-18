import PDFDocument from 'pdfkit';
import { ICitizenReport } from '../models/CitizenReport';
import { IIncident } from '../models/Incident';
import { IUser } from '../models/User';

export class PdfService {
  /**
   * Generates an official Complaint Acknowledgement PDF document
   */
  async generateAcknowledgementPdf(
    report: ICitizenReport,
    incident: IIncident,
    user?: IUser
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `CivicPulse Acknowledgement Receipt - ${report.complaintId}`,
            Author: 'CivicPulse Municipal Platform',
            Subject: 'Civic Issue Complaint Receipt',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Colors
        const primaryNavy = '#0F172A';
        const accentSaffron = '#EA580C';
        const accentGreen = '#16A34A';
        const slateText = '#475569';
        const borderLight = '#CBD5E1';

        // 1. Header with CivicPulse Branding
        doc
          .rect(40, 40, 515, 65)
          .fillAndStroke('#F8FAFC', borderLight);

        doc
          .fillColor(primaryNavy)
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('CIVICPULSE MUNICIPAL PLATFORM', 55, 52);

        doc
          .fillColor(accentSaffron)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('OFFICIAL COMPLAINT ACKNOWLEDGEMENT RECEIPT', 55, 75);

        doc
          .fillColor(slateText)
          .fontSize(8)
          .font('Helvetica')
          .text('Government of India • Smart Municipal Operations Initiative', 55, 88);

        // 2. Receipt Key Box
        const startY = 120;
        doc
          .rect(40, startY, 515, 75)
          .fillAndStroke('#EFF6FF', '#BFDBFE');

        doc
          .fillColor('#1E3A8A')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('COMPLAINT REFERENCE ID', 55, startY + 12);

        doc
          .fillColor(primaryNavy)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(report.complaintId, 55, startY + 24);

        doc
          .fillColor('#1E3A8A')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('LINKED INCIDENT ID', 320, startY + 12);

        doc
          .fillColor(primaryNavy)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(incident.incidentId, 320, startY + 26);

        doc
          .fillColor(slateText)
          .fontSize(8)
          .font('Helvetica')
          .text(`Submission Date: ${new Date(report.createdAt).toLocaleString('en-IN')}`, 55, startY + 52);

        doc
          .fillColor(accentGreen)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`STATUS: ${incident.status.toUpperCase()}`, 320, startY + 52);

        // 3. Issue Classification Section
        let currentY = 210;
        doc
          .fillColor(primaryNavy)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('1. Operational Issue Classification', 40, currentY);

        doc
          .moveTo(40, currentY + 16)
          .lineTo(555, currentY + 16)
          .strokeColor(borderLight)
          .stroke();

        currentY += 25;

        // Details grid
        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Department:', 40, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(incident.department, 150, currentY);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Issue Category:', 320, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(incident.complaintType.replace(/_/g, ' '), 410, currentY);

        currentY += 20;

        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Urgency Level:', 40, currentY);
        doc.font('Helvetica-Bold').fillColor(accentSaffron).text(incident.effectivePriority, 150, currentY);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('SLA Resolution Target:', 320, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(new Date(incident.slaDeadline).toLocaleString('en-IN'), 410, currentY);

        // 4. Incident Location
        currentY += 35;
        doc
          .fillColor(primaryNavy)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('2. Confirmed Incident Location', 40, currentY);

        doc
          .moveTo(40, currentY + 16)
          .lineTo(555, currentY + 16)
          .strokeColor(borderLight)
          .stroke();

        currentY += 25;

        const [lng, lat] = report.confirmedLocation.coordinates;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('GPS Coordinates:', 40, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(`Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`, 150, currentY);

        currentY += 18;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Location Source:', 40, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(report.locationSource.toUpperCase(), 150, currentY);

        if (report.addressText) {
          currentY += 18;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Address Landmark:', 40, currentY);
          doc.font('Helvetica').fillColor(primaryNavy).text(report.addressText, 150, currentY, { width: 380 });
        }

        // 5. Complaint Description
        currentY += 35;
        doc
          .fillColor(primaryNavy)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('3. Problem Description & AI Summary', 40, currentY);

        doc
          .moveTo(40, currentY + 16)
          .lineTo(555, currentY + 16)
          .strokeColor(borderLight)
          .stroke();

        currentY += 25;

        if (report.nativeTranscript && report.nativeTranscript !== report.standardizedEnglishDescription) {
          doc.fontSize(8).font('Helvetica-Bold').fillColor(slateText).text('Original Input (Spoken / Written):', 40, currentY);
          currentY += 12;
          doc.fontSize(9).font('Helvetica').fillColor(primaryNavy).text(report.nativeTranscript, 40, currentY, { width: 515 });
          currentY += 25;
        }

        doc.fontSize(8).font('Helvetica-Bold').fillColor(slateText).text('Standardized Description:', 40, currentY);
        currentY += 12;
        doc.fontSize(9).font('Helvetica').fillColor(primaryNavy).text(report.standardizedEnglishDescription, 40, currentY, { width: 515 });

        // 6. Citizen Information (Privacy-protected / masked)
        currentY += 40;
        doc
          .fillColor(primaryNavy)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('4. Citizen Reporter Information', 40, currentY);

        doc
          .moveTo(40, currentY + 16)
          .lineTo(555, currentY + 16)
          .strokeColor(borderLight)
          .stroke();

        currentY += 25;

        // Mask phone: e.g. +91 98****3210
        let maskedPhone = 'Confidential';
        if (user?.phone) {
          const len = user.phone.length;
          maskedPhone = user.phone.substring(0, 5) + '****' + user.phone.substring(len - 4);
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Reporter Name:', 40, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(user?.name || 'Registered Citizen', 150, currentY);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(slateText).text('Registered Mobile:', 320, currentY);
        doc.font('Helvetica').fillColor(primaryNavy).text(maskedPhone, 420, currentY);

        // 7. Instructions for Tracking
        currentY += 45;
        doc
          .rect(40, currentY, 515, 60)
          .fillAndStroke('#F1F5F9', borderLight);

        doc
          .fillColor(primaryNavy)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('HOW TO TRACK YOUR COMPLAINT STATUS', 55, currentY + 10);

        doc
          .fillColor(slateText)
          .fontSize(8)
          .font('Helvetica')
          .text(
            '1. Log in to the CivicPulse portal at any time to monitor live resolution progress.\n' +
            `2. Quote your Complaint Reference ID (${report.complaintId}) for municipal inquiries.\n` +
            '3. You will receive real-time notifications upon field worker assignment and resolution verification.',
            55,
            currentY + 24,
            { lineGap: 3 }
          );

        // Footer
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text(
            'This is an electronically generated municipal acknowledgement receipt. No physical signature is required.',
            40,
            760,
            { align: 'center', width: 515 }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const pdfService = new PdfService();
