/// <reference types="node" />

declare module 'basic-ftp' {
  import * as tls from 'tls'
  import * as stream from 'stream'
  import { Socket } from 'net'
  import { EventEmitter } from 'events'

  namespace utils {
    // function upgradeSocket(socket: Socket, options: tls.ConnectionOptions): Promise<tls.TLSSocket>
    // function parseIPv4PasvResponse()
    // function f();
  }

  class FTPContext {
    encoding: string;
    tlsOptions: tls.ConnectionOptions;
    ipFamily: number;
    verbose: boolean;
    socket?: Socket;
    dataSocketundefined?: Socket
    hasTLS: boolean;

    /**
     * Instantiate an FTP context.
     *
     * @param {number} [timeout=0]  Timeout in milliseconds to apply to control and data connections. Use 0 for no timeout.
     * @param {string} [encoding="utf8"]  Encoding to use for control connection. UTF-8 by default. Use "latin1" for older servers.
     */
    constructor(timeout?: number, encoding?: string)

    /**
     * Close control and data connections.
     */
    close(): void

    /**
     * Send an FTP command and handle any response until the new task is resolved. This returns a Promise that
     * will hold whatever the handler passed on when resolving/rejecting its task.
     *
     * @param {string} command
     * @param {HandlerCallback} handler
     * @returns {Promise<any>}
     */
    handle(command: string, handler: any): Promise<any>

    /**
     * Send an FTP command without waiting for or handling the result.
     *
     * @param {string} command
     */
    send(command: string): void

    /**
     * Log message if set to be verbose.
     *
     * @param {string} message
     */
    log(message: string): void

    /**
     * Suspend timeout on the control socket connection. This can be useful if
     * a timeout should be caught by the current data connection instead of the
     * control connection that sits idle during transfers anyway.
     *
     * @param {boolean} suspended
     */
    suspendControlTimeout(suspended: boolean): void
  }

  interface AccessOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    secure: boolean;
    secureOptions: tls.ConnectionOptions;
  }

  interface ProgressInfo {
    name: string;
    type: string;
    bytes: number;
    bytesOverall: number;
  }


  namespace FileInfo {
    //interface Permission {}
    enum Permission {
      Read = 1,
      Write = 2,
      Execute = 4
    }

    //interface Type {}
    enum Type {
      File = 0,
      Directory = 1,
      SymbolicLink = 2,
      Unknown = 3
    }

    interface Permissions {
      user: FileInfo.Permission
      group: FileInfo.Permission
      world: FileInfo.Permission
    }
  }

  class FileInfo {
    name: string;
    type: FileInfo.Type;
    size: number;
    hardLinkCount: number;
    permissions: FileInfo.Permissions
    link: string;
    group: string;
    user: string;
    date: string;
    isDirectory: boolean;
    isFile: boolean;
    isSymbolicLink: boolean;

    constructor(name: string);
  }

  interface PositiveResponse {
    code: number;
    message: string;
  }

  interface NegativeResponse {
    error: string | Object
  }

  class Client {
    ftp: FTPContext
    prepareTransfer: (client: Client) => Promise<Response>
    parseList: (rawList: string) => any[]

    constructor(timeout?: number);

    /**
     * Close all connections. The FTP client can't be used anymore after calling this.
     */
    close(): void

    /**
     * Connect to an FTP server.
     *
     * @param {string} [host=localhost]  Host the client should connect to.
     * @param {number} [port=21]  Port the client should connect to.
     * @return {Promise<PositiveResponse>}
     */
    connect(host: string, port: number): Promise<PositiveResponse>;

    /**
     * Send an FTP command.
     *
     * If successful it will return a response object that contains the return code as well
     * as the whole message. Ignore FTP error codes if you don't want an exception to be thrown
     * if an FTP command didn't succeed.
     *
     * @param {string} command  FTP command to send.
     * @param {boolean} [ignoreErrorCodes=false]  Whether to ignore FTP error codes in result.
     * @return {Promise<PositiveResponse>}
     */
    send(command: string, ignoreErrorCodes: boolean): Promise<PositiveResponse>

    /**
     * Upgrade the current socket connection to TLS.
     *
     * @param {Object} [options={}]  TLS options as in `tls.connect(options)`
     * @param {string} [command="AUTH TLS"]  Set the authentication command, e.g. "AUTH SSL" instead of "AUTH TLS".
     * @return {Promise<PositiveResponse>}
     */
    useTLS(options: tls.ConnectionOptions, command: string): Promise<PositiveResponse>

    /**
     * Login a user with a password.
     *
     * @param {string} [user="anonymous"]  Username to use for login.
     * @param {string} [password="guest"]  Password to use for login.
     * @returns {Promise<PositiveResponse>}
     */
    login(user: string, password: string): Promise<PositiveResponse>

    /**
     * Set the usual default settings.
     *
     * Settings used:
     * * Binary mode (TYPE I)
     * * File structure (STRU F)
     * * Additional settings for FTPS (PBSZ 0, PROT P)
     */
    useDefaultSettings(): void

    /**
     * Convenience method that calls `connect`, `useTLS`, `login` and `useDefaultSettings`.
     *
     * @typedef {Object} AccessOptions
     * @property {string} [host]  Host the client should connect to.
     * @property {number} [port]  Port the client should connect to.
     * @property {string} [user]  Username to use for login.
     * @property {string} [password]  Password to use for login.
     * @property {boolean} [secure]  Use explicit FTPS over TLS.
     * @property {Object} [secureOptions]  TLS options as in `tls.connect(options)`
     * @param {AccessOptions} options
     * @returns {Promise<PositiveResponse>} The response after initial connect.
     */
    access(options: AccessOptions): Promise<PositiveResponse>

    /**
     * Set the working directory.
     *
     * @param {string} path
     * @returns {Promise<PositiveResponse>}
     */
    cd(path: string): Promise<PositiveResponse>

    /**
     * Get the current working directory.
     *
     * @returns {Promise<string>}
     */
    pwd(): Promise<string>

    /**
     * Get a description of supported features.
     *
     * This sends the FEAT command and parses the result into a Map where keys correspond to available commands
     * and values hold further information. Be aware that your FTP servers might not support this
     * command in which case this method will not throw an exception but just return an empty Map.
     *
     * @returns {Promise<Map<string, string>>}
     */
    features(): Promise<Map<string, string>>

    /**
     * Get the size of a file.
     *
     * @param {string} filename  Name of the file in the current working directory.
     * @returns {Promise<number>}
     */
    size(filename: string): Promise<number>

    /**
     * Rename a file.
     *
     * Depending on the FTP server this might also be used to move a file from one
     * directory to another by providing full paths.
     *
     * @param {string} path
     * @param {string} newPath
     * @returns {Promise<PositiveResponse>} response of second command (RNTO)
     */
    rename(path: string, newPath: string): Promise<PositiveResponse>

    /**
     * Remove a file from the current working directory.
     *
     * You can ignore FTP error return codes which won't throw an exception if e.g.
     * the file doesn't exist.
     *
     * @param {string} filename  Name of the file to remove.
     * @param {boolean} [ignoreErrorCodes=false]  Ignore error return codes.
     * @returns {Promise<PositiveResponse>}
     */
    remove(filename: string, ignoreErrorCodes: boolean): Promise<PositiveResponse>

    /**
     * @typedef {Object} ProgressInfo
     * @property {string} name  A name describing this info, e.g. the filename of the transfer.
     * @property {string} type  The type of transfer, typically "upload" or "download".
     * @property {number} bytes  Transferred bytes in current transfer.
     * @property {number} bytesOverall  Transferred bytes since last counter reset. Useful for tracking multiple transfers.
     */

    /**
     * Report transfer progress for any upload or download to a given handler.
     *
     * This will also reset the overall transfer counter that can be used for multiple transfers. You can
     * also pass `undefined` as a handler to stop reporting to an earlier one.
     *
     * @param {((info: ProgressInfo) => void)} [handler=undefined]  Handler function to call on transfer progress.
     */
    trackProgress(handler: (info: ProgressInfo) => void): void

    /**
     * Upload data from a readable stream and store it as a file with a given filename in the current working directory.
     *
     * @param {stream.Readable} readableStream  The stream to read from.
     * @param {string} remoteFilename  The filename of the remote file to write to.
     * @returns {Promise<PositiveResponse>}
     */
    upload(readableStream: stream.Readable, remoteFilename: string): Promise<PositiveResponse>

    /**
     * Download a file with a given filename from the current working directory
     * and pipe its data to a writable stream. You may optionally start at a specific
     * offset, for example to resume a cancelled transfer.
     *
     * @param {stream.Writable} writableStream  The stream to write to.
     * @param {string} remoteFilename  The name of the remote file to read from.
     * @param {number} [startAt=0]  The offset to start at.
     * @returns {Promise<PositiveResponse>}
     */
    download(writableStream: stream.Writable, remoteFilename: string, startAt: number): Promise<PositiveResponse>

    /**
     * List files and directories in the current working directory.
     *
     * @returns {Promise<FileInfo[]>}
     */
    list(): Promise<FileInfo[]>

    /**
     * Remove a directory and all of its content.
     *
     * After successfull completion the current working directory will be the parent
     * of the removed directory if possible.
     *
     * @param {string} remoteDirPath  The path of the remote directory to delete.
     * @example client.removeDir("foo") // Remove directory 'foo' using a relative path.
     * @example client.removeDir("foo/bar") // Remove directory 'bar' using a relative path.
     * @example client.removeDir("/foo/bar") // Remove directory 'bar' using an absolute path.
     * @example client.removeDir("/") // Remove everything.
     * @returns {Promise<void>}
     */
    removeDir(remoteDirPath: string): Promise<void>

    /**
     * Remove all files and directories in the working directory without removing
     * the working directory itself.
     *
     * @returns {Promise<void>}
     */
    clearWorkingDir(): Promise<void>

    /**
     * Upload the contents of a local directory to the working directory.
     *
     * You can optionally provide a `remoteDirName` to put the contents inside a directory which
     * will be created if necessary. This will overwrite existing files with the same names and
     * reuse existing directories. Unrelated files and directories will remain untouched.
     *
     * @param {string} localDirPath  A local path, e.g. "foo/bar" or "../test"
     * @param {string} [remoteDirName]  The name of the remote directory. If undefined, directory contents will be uploaded to the working directory.
     */
    uploadDir(localDirPath: string, remoteDirName: string): void

    /**
     * Download all files and directories of the working directory to a local directory.
     *
     * @param {string} localDirPath  The local directory to download to.
     */
    downloadDir(localDirPath: string): void

    /**
     * Make sure a given remote path exists, creating all directories as necessary.
     * This function also changes the current working directory to the given path.
     *
     * @param {string} remoteDirPath
     */
    ensureDir(remoteDirPath: string): void
  }

  function parseControlResponse(text: string): { messages: string[], rest: string }

  function parseList(rawList: string): FileInfo[]

  interface FileListParser {
    testLine: (line: string) => boolean
    parseLine: (line: string) => FileInfo | undefined
  }

  interface ProgressInfo {
    name: string;
    type: string;
    bytes: number;
    bytesOverall: number;
  }

  class ProgressTracker {
    bytesOverall: number;
    intervalMillis: number;

    constructor()

    /**
     * Register a new handler for progress info. Use `undefined` to disable reporting.
     *
     * @param {((info: ProgressInfo) => void)} [handler]
     */
    reportTo(handler: (info: ProgressInfo) => void | undefined): void

    /**
     * Start tracking transfer progress of a socket.
     *
     * @param {Socket} socket  The socket to observe.
     * @param {string} name  A name associated with this progress tracking, e.g. a filename.
     * @param {string} type  The type of the transfer, typically "upload" or "download".
     */
    start(socket: Socket, name: string, type: string): void

    /**
     * Stop tracking transfer progress.
     */
    stop(): void

    /**
     * Call the progress handler one more time, then stop tracking.
     */
    updateAndStop(): void
  }

  class StringWriter extends EventEmitter {
    encoding: any;
    text: string;

    constructor(encoding: any)

    append(chunk: any): void
  }

  class TransferResolver {
    ftp: FTPContext;
    result?: any;
    confirmed: boolean;

    constructor(ftp: FTPContext)

    resolve(task: any, result: any): void
    confirm(task: any): void
    reject(task: any, reason: any): void
  }

  function nullObject(): any
}
