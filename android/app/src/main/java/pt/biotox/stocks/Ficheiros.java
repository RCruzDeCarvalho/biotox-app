package pt.biotox.stocks;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/** Dá às outras apps (WhatsApp, email…) acesso só de leitura à imagem a partilhar. */
public class Ficheiros extends ContentProvider {

    // content://<app>.ficheiros/partilha/<nome> (imagens a partilhar) ou /camara/<nome> (fotografias tiradas na app)
    private File ficheiro(Uri uri, boolean criar) throws FileNotFoundException {
        java.util.List<String> seg = uri.getPathSegments();
        String dir = seg.size() >= 2 && "camara".equals(seg.get(0)) ? "camara" : "partilha";
        File pasta = new File(getContext().getCacheDir(), dir);
        pasta.mkdirs();
        File f = new File(pasta, new File(uri.getLastPathSegment()).getName());
        if (!f.exists() && !criar) throw new FileNotFoundException(uri.toString());
        return f;
    }
    private File ficheiro(Uri uri) throws FileNotFoundException { return ficheiro(uri, false); }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        boolean escrever = mode != null && mode.contains("w");
        boolean camara = uri.getPathSegments().size() >= 2 && "camara".equals(uri.getPathSegments().get(0));
        if (escrever && !camara) throw new FileNotFoundException("Só leitura");
        File f = ficheiro(uri, escrever);
        return ParcelFileDescriptor.open(f, escrever ? ParcelFileDescriptor.parseMode(mode) : ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] proj, String sel, String[] args, String ord) {
        try {
            File f = ficheiro(uri);
            MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
            c.addRow(new Object[]{f.getName(), f.length()});
            return c;
        } catch (FileNotFoundException e) {
            return null;
        }
    }

    @Override public String getType(Uri uri) { return String.valueOf(uri.getLastPathSegment()).toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg"; }
    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
