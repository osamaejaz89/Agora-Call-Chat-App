import AgoraUIKit from 'agora-rn-uikit';

const VideoCallScreen = ({ route }) => {
  const { channelId } = route.params;
  const connectionData = {
    appId: '62b393095cfe4cb5ab441052be58d754',
    channel: channelId,
    token: '',
    // token:
    //   '007eJxTYDBx53OeLbGXb59N0OYrLYcVr3P7K+UeCBN8enDpsqV+S+crMCSlGieZG6QYGiQZp5iYJSYnArFximFKqomRsbGRpcXDrRbpDYGMDArXTFkYGSAQxGdhKEktLmFgAADyDB6v', // enter your channel token as a string
  };
  return <AgoraUIKit connectionData={connectionData} />;
};

export default VideoCallScreen;
