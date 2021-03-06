import { drizzleConnect } from 'drizzle-react'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

class IpfsStorageContractForm extends Component {
  constructor(props, context) {
    super(props);

    this.handleFileChange = this.handleFileChange.bind(this)
    this.handleTagsChange = this.handleTagsChange.bind(this)
    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleIpfsResult = this.handleIpfsResult.bind(this)
    this.getFiles = this.getFiles.bind(this)
    this.callContractMethod = this.callContractMethod.bind(this)

    this.contracts = context.drizzle.contracts;

    this.state = {
      name:'',
      hash:'',
      tags:'',
      status:'Idle',
      file:'',
      files: [],
      buffer:'',
      transactionHash:'',
      etherscanLink:''
    }
  }

  componentDidMount(){
    this.getFiles()
    this.contracts["InterplanetaryStorage"].events
    .LogUploadFile({}, (error, event) => {
    })
    .on('data', (event) => {
      this.setState({ status: "new file stored!  " });
      this.setState({ etherscanLink: " " });
      this.setState({ transactionHash: " " });

      this.getFiles()
    })
  }

getFiles(){
  this.setState({files: []}, () => {

    this.contracts["InterplanetaryStorage"].methods.getFileIndexes().call({from: this.account },
      (error, indexArray) => {
          indexArray.map((item) => {
            return(
              this.contracts["InterplanetaryStorage"].methods.getFile(item).call({from: this.account },
               (error, file) => {
                    var data = [...this.state.files, {
                        index: item,
                        name:file[0],
                        hash:file[1],
                        tags:file[2],
                        timestamp:file[3]
                    }];

                    this.setState({ files: this.getUnique(data, 'hash') });
              })
            )
          })
      });
  });
}

getUnique(arr, comp) {

  const unique = arr
       .map(e => e[comp])

     // store the keys of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)

    // eliminate the dead keys & store unique objects
    .filter(e => arr[e]).map(e => arr[e]);

   return unique;
}


  handleFileChange(e) {
    this.setState({file:e.target.files[0]})
    this.setState({name:e.target.files[0].name})

    const file = e.target.files[0]
    let reader = new window.FileReader()
    reader.readAsArrayBuffer(file)
    reader.onloadend = () => this.getBuffer(reader)
  }

  getBuffer = async(reader) => {
    const buffer = await Buffer.from(reader.result);
    this.setState({buffer})
  }

  handleTagsChange(e) {
    this.setState({tags:e.target.value})
  }

  handleFormSubmit(e) {
    e.preventDefault();

    this.setState({ status: "please wait..." });
    ipfs.files.add(this.state.buffer, this.handleIpfsResult);
  }

  handleIpfsResult(err,files){
    this.setState({ hash:files[0].hash });
    this.setState({ status: "Accept the tx please"});

    this.callContractMethod();
  }

  callContractMethod(){

    this.contracts["InterplanetaryStorage"].methods.insertFile(
      this.state.name,
      this.state.hash,
      this.state.tags
    ).send({from: this.account })
    .on('transactionHash', (transactionHash) => {
      this.setState({transactionHash});
      this.setState({name: ''});
      this.setState({ status: "Tx hash: "});
      this.setState({ etherscanLink:'https://rinkeby.etherscan.io/tx/' + transactionHash});
    })
      .on('confirmation', (confNumber, receipt) => {
        this.getFiles();
      })

  }

  render() {
    return (
      <div className="section">
        <div>
          <p>
            <strong>
              Status: {this.state.status}
              <a href={this.state.etherscanLink} target="_blank">{this.state.etherscanLink}</a>
            </strong>
          </p>
        </div>
        <form onSubmit={this.handleFormSubmit} className="form">
        Select a file to upload, add some tags and click on Upload. The hash will
        be stored inside the smart contract and the file will be stored inside IPFS.
        The file hash generated by IPFS can be used as link in order to access the file.
        <br />
        <br />

          <div class="file" data-provides="fileupload">
            <label class="file-label">
            <input type="file" className="file-input" onChange={this.handleFileChange} name="resume" />
              <span class="file-cta">
                <span class="file-icon">
                  <i class="fas fa-upload"></i>
                </span>
                <span class="file-label">
                  Choose a file…
                </span>
              </span>
            </label>
          </div>
          <br />
          <br />

          <div>
            <div>
                <div className="field">
                  <label className="label">Add some tags separated by comma</label>
                  <div className="control">
                    <input type="text" className="input" onChange={this.handleTagsChange} />
                  </div>
                  <br />
                  <br />

                  <div>
                    <button type="submit" class="button is-success">UPLOAD</button>
                  </div>
                </div>
            </div>
          </div>
          <div>

          </div>
        </form>
        <br />
        <br />

        <div>
          <div>
            <div>
              <h2> Here you can see your stored files</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>File name</th>
                    <th>Timestamp</th>
                    <th>Tags</th>
                    <th>IPFS Link</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.files.map((item) => {
                     return(
                      <tr key={item.index}>
                        <td>{item.name}</td>
                        <td><a href={`/file/${item.index}/${item.hash}`}>{item.timestamp}</a></td>
                        <td>{item.tags}</td>
                        <td><a href={`https://gateway.ipfs.io/ipfs/${item.hash}`} target="_blank">{ item.hash }</a></td>
                      </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

IpfsStorageContractForm.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    contracts: state.contracts
  }
}

export default drizzleConnect(IpfsStorageContractForm, mapStateToProps)
