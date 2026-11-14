package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.INVALID_REQUEST;
import static com.example.devnotes.ocr.OcrFailure.Reason.TOO_LARGE;

import jakarta.servlet.http.HttpServletRequest;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.tomcat.util.http.fileupload.FileUpload;
import org.apache.tomcat.util.http.fileupload.MultipartStream;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;

final class OcrMultipart {
    private static final int MAX_REQUEST_BYTES = 1_100_000;

    private OcrMultipart() {}

    static Upload read(HttpServletRequest request) {
        if (request.getContentType() == null) {
            throw INVALID_REQUEST.failure();
        }
        try {
            MediaType type = MediaType.parseMediaType(request.getContentType());
            String boundary = type.getParameter("boundary");
            if (!MediaType.MULTIPART_FORM_DATA.equalsTypeAndSubtype(type) || boundary == null) {
                throw INVALID_REQUEST.failure();
            }
            if (boundary.startsWith("\"") && boundary.endsWith("\"") && boundary.length() > 1) {
                boundary = boundary.substring(1, boundary.length() - 1);
            }
            if (boundary.isEmpty()
                    || boundary.length() > 70
                    || !StandardCharsets.US_ASCII.newEncoder().canEncode(boundary)) {
                throw INVALID_REQUEST.failure();
            }
            if (request.getContentLengthLong() > MAX_REQUEST_BYTES) {
                throw TOO_LARGE.failure();
            }
            byte[] body = request.getInputStream().readNBytes(MAX_REQUEST_BYTES + 1);
            if (body.length > MAX_REQUEST_BYTES) {
                throw TOO_LARGE.failure();
            }

            var multipart = new MultipartStream(
                    new ByteArrayInputStream(body), boundary.getBytes(StandardCharsets.US_ASCII), null);
            if (!multipart.skipPreamble()) {
                throw INVALID_REQUEST.failure();
            }
            var headers = new FileUpload().getParsedHeaders(multipart.readHeaders());
            ContentDisposition disposition = ContentDisposition.parse(headers.getHeader("Content-Disposition"));
            if (!disposition.isFormData()
                    || !"file".equals(disposition.getName())
                    || disposition.getFilename() == null) {
                throw INVALID_REQUEST.failure();
            }
            byte[] file = multipart.newInputStream().readNBytes(OcrScreenshotValidator.MAX_FILE_BYTES + 1);
            if (file.length > OcrScreenshotValidator.MAX_FILE_BYTES) {
                throw TOO_LARGE.failure();
            }
            if (multipart.readBoundary()) {
                throw INVALID_REQUEST.failure();
            }
            return new Upload(file, headers.getHeader("Content-Type"));
        } catch (IOException | IllegalArgumentException failure) {
            throw INVALID_REQUEST.failure();
        }
    }

    record Upload(byte[] bytes, String contentType) {}
}
