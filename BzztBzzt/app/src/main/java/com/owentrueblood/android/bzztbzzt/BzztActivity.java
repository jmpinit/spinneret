package com.owentrueblood.android.bzztbzzt;

import android.content.Context;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import com.koushikdutta.async.ByteBufferList;
import com.koushikdutta.async.DataEmitter;
import com.koushikdutta.async.callback.DataCallback;
import com.koushikdutta.async.http.AsyncHttpClient;
import com.koushikdutta.async.http.AsyncHttpResponse;
import com.koushikdutta.async.http.WebSocket;

import org.json.JSONException;
import org.json.JSONObject;

public class BzztActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_bzzt);
    }

    void connectPressed(View button) {
        TextView addressText = (TextView) findViewById(R.id.addressText);

        final Context context = this;

        //String url = "ws://" + addressText.getText() + ":8080";
        String url = "ws://192.168.1.42:8080";
        Log.d("bzzt", "Will try to connect to " + url);

        AsyncHttpClient.getDefaultInstance().websocket(url, "", new AsyncHttpClient.WebSocketConnectCallback() {
            @Override
            public void onCompleted(Exception ex, WebSocket webSocket) {
                if (ex != null) {
                    ex.printStackTrace();
                    return;
                }

                // FIXME stringify JSON object
                webSocket.send("{ \"command\": \"register\", \"type\": \"phone\" }");
                webSocket.setStringCallback(new WebSocket.StringCallback() {
                    public void onStringAvailable(String message) {
                        Log.d("bzzt", "I got a string: " + message);

                        try {
                            JSONObject messageObj = new JSONObject(message);
                            int intensity = messageObj.getInt("intensity");
                            int duration = messageObj.getInt("duration");

                            Vibrator vibe = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                            vibe.vibrate(VibrationEffect.createOneShot(duration, intensity));
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                });
                webSocket.setDataCallback(new DataCallback() {
                    public void onDataAvailable(DataEmitter emitter, ByteBufferList byteBufferList) {
                        Log.d("bzzt", "I got some bytes!");
                        // note that this data has been read
                        byteBufferList.recycle();
                    }
                });
            }
        });
    }

}
