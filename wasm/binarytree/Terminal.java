package binarytree.com.java;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import org.teavm.interop.Async;
import org.teavm.interop.AsyncCallback;
import org.teavm.jso.JSBody;
import org.teavm.jso.JSFunctor;
import org.teavm.jso.JSObject;

/**
 * Browser stand-in for the console: System.out/err go to the page's terminal
 * panel, and readLine() suspends (TeaVM @Async) until the user presses Enter.
 * The page provides window.btTerm = { write(text), readLine(callback) }.
 */
final class Terminal {

    private Terminal() {
    }

    static void init() {
        PrintStream stream = new PrintStream(new PageStream(), true);
        System.setOut(stream);
        System.setErr(stream);
    }

    @Async
    static native String readLine();

    private static void readLine(AsyncCallback<String> callback) {
        System.out.flush();
        requestLine(new LineHandler() {
            @Override
            public void handle(String line) {
                callback.complete(line);
            }
        });
    }

    @JSFunctor
    interface LineHandler extends JSObject {
        void handle(String line);
    }

    @JSBody(params = "handler", script = "window.btTerm.readLine(handler);")
    private static native void requestLine(LineHandler handler);

    @JSBody(params = "text", script = "window.btTerm.write(text);")
    private static native void write(String text);

    /** Buffers bytes and hands them to the page as UTF-8 text on newline or flush. */
    private static final class PageStream extends OutputStream {
        private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();

        @Override
        public void write(int b) {
            buffer.write(b);
            if (b == '\n') {
                flush();
            }
        }

        @Override
        public void flush() {
            if (buffer.size() > 0) {
                Terminal.write(new String(buffer.toByteArray(), StandardCharsets.UTF_8));
                buffer.reset();
            }
        }
    }
}
