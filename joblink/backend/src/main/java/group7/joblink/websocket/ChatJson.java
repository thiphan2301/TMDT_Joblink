package group7.joblink.websocket;

import group7.joblink.dto.response.ChatResponses.MessageRow;

// JSON tối thiểu cho giao thức chat qua WebSocket — chỉ gồm vài trường
// cố định nên tự đọc/ghi để khỏi phụ thuộc thêm thư viện.
// Khung tin:
//   client -> server: {"type":"send","conversationId":1,"content":"..."}
//                     {"type":"read","conversationId":1}
//   server -> client: {"type":"message","message":{...MessageRow...}}
//                     {"type":"read","conversationId":1,"readerId":2}
//                     {"type":"error","message":"..."}
final class ChatJson {

    private ChatJson() {
    }

    static String messageEvent(MessageRow m) {
        return "{\"type\":\"message\",\"message\":{"
                + "\"id\":" + m.id()
                + ",\"conversationId\":" + m.conversationId()
                + ",\"senderId\":" + m.senderId()
                + ",\"content\":\"" + escape(m.content()) + "\""
                + ",\"read\":" + m.read()
                + ",\"sentAt\":\"" + m.sentAt() + "\""
                + ",\"imageUrl\":"
                + (m.imageUrl() == null ? "null" : "\"" + escape(m.imageUrl()) + "\"")
                + "}}";
    }

    static String readEvent(int conversationId, int readerId) {
        return "{\"type\":\"read\",\"conversationId\":" + conversationId
                + ",\"readerId\":" + readerId + "}";
    }

    static String errorEvent(String message) {
        return "{\"type\":\"error\",\"message\":\"" + escape(message) + "\"}";
    }

    // Đọc một trường chuỗi trong JSON phẳng, có xử lý ký tự thoát.
    // Không thấy hoặc sai dạng thì trả null.
    static String stringField(String json, String field) {
        int i = findField(json, field);
        if (i < 0) return null;
        i = skipWhitespace(json, i);
        if (i >= json.length() || json.charAt(i) != '"') return null;
        StringBuilder out = new StringBuilder();
        for (int j = i + 1; j < json.length(); j++) {
            char c = json.charAt(j);
            if (c == '"') return out.toString();
            if (c == '\\' && j + 1 < json.length()) {
                char e = json.charAt(++j);
                switch (e) {
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case 'b' -> out.append('\b');
                    case 'f' -> out.append('\f');
                    case 'u' -> {
                        if (j + 4 < json.length()) {
                            out.append((char) Integer.parseInt(
                                    json.substring(j + 1, j + 5), 16));
                            j += 4;
                        }
                    }
                    default -> out.append(e);
                }
            } else {
                out.append(c);
            }
        }
        return null;
    }

    // Đọc một trường số nguyên trong JSON phẳng. Không thấy thì trả null.
    static Integer intField(String json, String field) {
        int i = findField(json, field);
        if (i < 0) return null;
        i = skipWhitespace(json, i);
        int start = i;
        if (i < json.length() && (json.charAt(i) == '-' )) i++;
        while (i < json.length() && Character.isDigit(json.charAt(i))) i++;
        if (i == start) return null;
        try {
            return Integer.parseInt(json.substring(start, i));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Vị trí ngay sau dấu ':' của "field":, hoặc -1.
    private static int findField(String json, String field) {
        String key = "\"" + field + "\"";
        int from = 0;
        while (true) {
            int idx = json.indexOf(key, from);
            if (idx < 0) return -1;
            int colon = json.indexOf(':', idx + key.length());
            if (colon < 0) return -1;
            return colon + 1;
        }
    }

    private static int skipWhitespace(String json, int i) {
        while (i < json.length() && Character.isWhitespace(json.charAt(i))) i++;
        return i;
    }

    static String escape(String text) {
        if (text == null) return "";
        StringBuilder out = new StringBuilder(text.length() + 8);
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }
}