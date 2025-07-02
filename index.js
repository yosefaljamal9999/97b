import { registerCommand } from "@vendetta/commands";
import { showToast } from "@vendetta/ui/toasts";
import { clipboard, storage } from "@vendetta/metro/common";
import * as DocumentPicker from "react-native-document-picker";
import * as RNFS from "react-native-fs";
import { Forms } from "@vendetta/ui/components";
const { FormRow, FormText, FormSelect } = Forms;

let command;

export default {
  onLoad() {
    command = registerCommand({
      name: "uploading",
      description: "Upload image from your device to imgbb",
      options: [],
      async execute() {
        const apiKey = storage.get("imgbb_api_key");
        if (!apiKey) {
          showToast("Please set your API key in plugin settings.", { type: "error" });
          return;
        }

        const expirationSetting = storage.get("imgbb_expiration") ?? "604800"; // default 7 days

        const res = await DocumentPicker.pickSingle({
          type: [DocumentPicker.types.images],
        });

        showToast("Reading file...", toastOpts("info"));

        const base64 = await RNFS.readFile(res.uri, "base64");

        showToast("Uploading...", toastOpts("info"));

        const formData = new FormData();
        formData.append("key", apiKey);
        formData.append("image", base64);
        if (expirationSetting !== "never") {
          formData.append("expiration", expirationSetting);
        }

        const response = await fetch("https://api.imgbb.com/1/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          const url = data.data.url;
          clipboard.setString(url);
          showToast(`Uploaded!\nCopied:\n${url}`, toastOpts("success"));
        } else {
          console.log(data);
          showToast("Upload failed", toastOpts("error"));
        }
      },
    });
  },

  onUnload() {
    command();
  },

  settings: () => (
    <>
      <FormRow
        label="Your imgbb API Key"
        subLabel="Paste your imgbb.com API key here"
        trailing={
          <FormText.Input
            placeholder="Paste API key"
            value={storage.get("imgbb_api_key") ?? ""}
            onChange={(v) => storage.set("imgbb_api_key", v)}
          />
        }
      />
      <FormRow
        label="Expiration Time"
        subLabel="Choose how long the image stays on imgbb"
      >
        <FormSelect
          options={[
            { label: "1 Day", value: "86400" },
            { label: "7 Days", value: "604800" },
            { label: "30 Days", value: "2592000" },
            { label: "Never (Permanent)", value: "never" }
          ]}
          value={storage.get("imgbb_expiration") ?? "604800"}
          onChange={(v) => storage.set("imgbb_expiration", v)}
        />
      </FormRow>
    </>
  ),
};

function toastOpts(type) {
  return { type, duration: 4000 };
}