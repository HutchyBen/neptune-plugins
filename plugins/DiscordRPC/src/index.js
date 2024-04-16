import { store, intercept, currentMediaItem } from "@neptune";
import { getMediaURLFromID } from "@neptune/utils";
import { AutoClient } from "discord-auto-rpc";

const unloadables = [];
const clientId = "1130698654987067493";

const formatLongString = (s) => (s.length >= 128 ? s.slice(0, 125) + "..." : s);

const rpc = new AutoClient({ transport: "ipc" });
const client = rpc.endlessLogin({ clientId });

client.then(() => {
  unloadables.push(
    intercept("playbackControls/TIME_UPDATE", ([current]) => {
      const state = store.getState();

      const { item: currentlyPlaying, type: mediaType } = currentMediaItem;

      const mediaURL = getMediaURLFromID(mediaType === "track" ? currentlyPlaying.album.cover : currentlyPlaying.imageId);
      const largeImageTextContent = mediaType === "track" ? currentlyPlaying.album.title : currentlyPlaying.title;

      const date = new Date();
      const now = (date.getTime() / 1000) | 0;
      const remaining = date.setSeconds(
        date.getSeconds() + (currentlyPlaying.duration - current)
      );

      const paused = state.playbackControls.playbackState == "NOT_PLAYING";

      rpc.setActivity({
        ...(paused
          ? {
              smallImageKey: "paused-icon",
              smallImageText: "Paused",
            }
          : {
              startTimestamp: now,
              endTimestamp: remaining,
            }),
        details: formatLongString(currentlyPlaying.title),
        state: formatLongString(
          "by " + currentlyPlaying.artists.map((a) => a.name).join(", ")
        ),
        type: 2,
        largeImageKey: mediaURL,
        // Discord requires largeImageText to be at least 2 characters long. So we add a invisible space to the end of the string if it's only 1 character long.
        largeImageText: largeImageTextContent.length >= 2 ? formatLongString(largeImageTextContent) : (largeImageTextContent + "‎"),
      });
    })
  );
});

export async function onUnload() {
  const resolvedClient = await client;
  unloadables.forEach((u) => u());

  try {
    resolvedClient.clearActivity();
    resolvedClient.destroy();
  } catch {}
}
