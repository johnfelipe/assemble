import React from 'react'
import Peer from 'peerjs'

export default class AudioController extends React.Component {
  constructor () {
    super()

    this.state = {
      audioStreams: [],
      myAudio: null
    }

    this.users = []
    this.outgoingCalls = {}
    this.incomingCalls = {}
  }

  componentWillMount () {
    const { users, me } = this.props
    this.users = users.slice()
    this.initializeMyStream()
  }

  initializeMyStream () {
    let { myAudio, audioStreams } = this.state
    let { incomingCalls } = this
    const { users, me } = this.props

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia
    navigator.getUserMedia({audio: true}, stream => {

      myAudio = stream
      this.peer = new Peer(me.id, {key: 'k4r0b5lpfn1m7vi'})
      this.peer.on('call', call => {
        console.log('Recieved call ', call)
        // Send them myAudio
        call.answer(myAudio)
        // Add their stream to state's audioStreams
        call.on('stream', remoteStream => {
          audioStreams.push(remoteStream)
        })
        debugger
        // Add this call to incomingCalls
        incomingCalls[call.id] = call
      })
      users.forEach(u => this.handleNewUser(u))

    }, function (err) {
      console.log('Failed to get user\'s media stream:', err)
    })
  }

  /**
   * If they are not already calling me, call them
   */
  handleNewUser (user) {
    let { incomingCalls, outgoingCalls } = this
    let { myAudio, audioStreams } = this.state

    // Are they already calling me? If so, do nothing
    if (incomingCalls[user.id]) {
      return true
    }

    // If I don't have an audio stream yet, we're not ready to make calls
    if (!myAudio) {
      return false
    }

    // Call them!
    console.log('Calling %s...', user.id)
    let call = this.peer.call(user.id, myAudio)
    call.on('stream', stream => {
      // Record this as an outgoingCall
      outgoingCalls[user.id] = call
      // Add its stream to list of audioStreams
      audioStreams.push(stream)
    })
  }

  /**
   * Remove the user from the audio stream
   */
  handleDepartedUser (user) {
    const { incomingCalls, outgoingCalls } = this

    let call = incomingCalls[user.id] || outgoingCalls[user.id]
    call.destroy()
  }

  componentWillReceiveProps (nextProps) {
    const { users, me } = nextProps

    let prevUsers = this.users.slice()
    let newUsers = []
    let oldUsers = []

    // Filter the users according whether we've seen them before
    users.forEach(u => {
      let prevIdx = oldUsers.indexOf(u)
      if (oldUsers.indexOf(u) > -1) {
        oldUsers.push(u)
        prevUsers.splice(prevIdx, 1)
      } else {
        newUsers.push(u)
      }
    })
    let departedUsers = this.users.slice()

    // Call appropriate methods
    newUsers.forEach(u => this.handleNewUser(u))
    departedUsers.forEach(u => this.handleDepartedUser(u))
  }

  componentWillUnmount () {
    this.peer.destroy()
  }

  render () {
    const audioEls = this.state.audioStreams.map(s => (<audio src={URL.createObjectURL(s)} />))

    return (
      <div className='audio-container'>
        {audioEls}
      </div>
    )
  }
}
