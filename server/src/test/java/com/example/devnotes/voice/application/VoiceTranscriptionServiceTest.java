package com.example.devnotes.voice.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

/** T-037: el contenedor se reconoce por la cabecera EBML y su DocType «webm» (S-105), como lo produce MediaRecorder. */
class VoiceTranscriptionServiceTest {

    private static final byte[] EBML_MAGIC = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};

    private GroqTranscriptionClient client;
    private VoiceTranscriptionService service;

    @BeforeEach
    void setUp() {
        client = mock(GroqTranscriptionClient.class);
        when(client.transcribe(any(MultipartFile.class), anyString()))
                .thenReturn(new TranscriptionResult("Texto ficticio.", "es"));
        service = new VoiceTranscriptionService(client);
    }

    /** Cabecera EBML de Chromium MediaRecorder: versión, longitudes, DocType, DocTypeVersion/ReadVersion. */
    static byte[] chromiumHeader(String docType) {
        var children = new ByteArrayOutputStream();
        children.writeBytes(new byte[] {0x42, (byte) 0x86, (byte) 0x81, 0x01});
        children.writeBytes(new byte[] {0x42, (byte) 0xF7, (byte) 0x81, 0x01});
        children.writeBytes(new byte[] {0x42, (byte) 0xF2, (byte) 0x81, 0x04});
        children.writeBytes(new byte[] {0x42, (byte) 0xF3, (byte) 0x81, 0x08});
        byte[] name = docType.getBytes(StandardCharsets.US_ASCII);
        children.writeBytes(new byte[] {0x42, (byte) 0x82, (byte) (0x80 | name.length)});
        children.writeBytes(name);
        children.writeBytes(new byte[] {0x42, (byte) 0x87, (byte) 0x81, 0x04});
        children.writeBytes(new byte[] {0x42, (byte) 0x85, (byte) 0x81, 0x02});
        byte[] body = children.toByteArray();
        var header = new ByteArrayOutputStream();
        header.writeBytes(EBML_MAGIC);
        header.write(0x80 | body.length);
        header.writeBytes(body);
        // Segment con tamaño desconocido y un primer byte de cluster: el resto de la grabación.
        header.writeBytes(new byte[] {0x18, 0x53, (byte) 0x80, 0x67, 0x01, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF});
        header.writeBytes(new byte[] {(byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, 0x1F, 0x43, (byte) 0xB6});
        return header.toByteArray();
    }

    private static MockMultipartFile audio(byte[] bytes) {
        return new MockMultipartFile("file", "recording.webm", "audio/webm;codecs=opus", bytes);
    }

    @Test
    void acceptsTheEbmlHeaderMediaRecorderProduces() {
        TranscriptionResult result = service.transcribe(audio(chromiumHeader("webm")), "fictitious-key");

        assertThat(result.text()).isEqualTo("Texto ficticio.");
        verify(client).transcribe(any(MultipartFile.class), anyString());
    }

    @Test
    void rejectsMatroskaDocTypeWithoutCallingTheProvider() {
        assertThatThrownBy(() -> service.transcribe(audio(chromiumHeader("matroska")), "fictitious-key"))
                .isInstanceOf(TranscriptionException.InvalidRequest.class);
        verify(client, never()).transcribe(any(MultipartFile.class), anyString());
    }

    @Test
    void rejectsRiffContainersWithoutCallingTheProvider() {
        byte[] riff = "RIFF\0\0\0\0webm".getBytes(StandardCharsets.US_ASCII);

        assertThatThrownBy(() -> service.transcribe(audio(riff), "fictitious-key"))
                .isInstanceOf(TranscriptionException.InvalidRequest.class);
        verify(client, never()).transcribe(any(MultipartFile.class), anyString());
    }

    @Test
    void rejectsTruncatedOrUnterminatedHeadersWithoutCallingTheProvider() {
        byte[] full = chromiumHeader("webm");
        for (int length : new int[] {3, 4, 5, 20}) {
            byte[] truncated = Arrays.copyOf(full, length);
            assertThatThrownBy(() -> service.transcribe(audio(truncated), "fictitious-key"))
                    .as("prefix of %d bytes", length)
                    .isInstanceOf(TranscriptionException.InvalidRequest.class);
        }
        byte[] invalidSize = Arrays.copyOf(full, full.length);
        invalidSize[4] = 0x00; // VINT sin marcador de longitud
        assertThatThrownBy(() -> service.transcribe(audio(invalidSize), "fictitious-key"))
                .isInstanceOf(TranscriptionException.InvalidRequest.class);
        verify(client, never()).transcribe(any(MultipartFile.class), anyString());
    }
}
