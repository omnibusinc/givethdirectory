import async from "async";
import _ from "lodash";
import { GivethDirectoryAbi, GivethDirectoryByteCode } from "../contracts/GivethDirectory.sol.js";

export class GivethDirectory {

    constructor(web3, address) {
        this.web3 = web3;
        this.contract = this.web3.eth.contract(GivethDirectoryAbi).at(address);
    }

    getState(cb) {
        const st = {};
        let nCampaigns;
        async.series([
            (cb1) => {
                this.contract.owner((err, _owner) => {
                    if (err) { cb(err); return; }
                    st.owner = _owner;
                    cb1();
                });
            },
            (cb1) => {
                this.contract.numberOfCampaigns((err, res) => {
                    if (err) { cb(err); return; }
                    nCampaigns = res.toNumber();
                    st.campaigns = [];
                    cb1();
                });
            },
            (cb1) => {
                async.eachSeries(_.range(0, nCampaigns), (idCampaign, cb2) => {
                    this.contract.getCampaign(idCampaign, (err, res) => {
                        if (err) { cb(err); return; }
                        const campaigStatus = [
                            "Preparing",
                            "Active",
                            "Obsoleted",
                            "Deleted",
                        ];
                        st.campaigns.push({
                            name: res[ 0 ],
                            description: res[ 1 ],
                            url: res[ 2 ],
                            token: res[ 3 ],
                            vault: res[ 4 ],
                            milestoneTracker: res[ 5 ],
                            extra: res[ 6 ],
                            status: campaigStatus[ res[ 7 ].toNumber() ],
                        });
                        cb2();
                    });
                }, cb1);
            },
        ], (err) => {
            if (err) { cb(err); return; }
            cb(null, st);
        });
    }
}

export function deploy(web3, opts, cb) {
    let account;
    let givethDirectory;
    async.series([
        (cb1) => {
            if (opts.from) {
                account = opts.from;
                cb1();
            } else {
                web3.eth.getAccounts((err, _accounts) => {
                    if (err) { cb(err); return; }
                    if (_accounts.length === 0) return cb1(new Error("No account to deploy a contract"));
                    account = _accounts[ 0 ];
                    cb1();
                });
            }
        },
        (cb2) => {
            const contract = web3.eth.contract(GivethDirectoryAbi);
            contract.new(
                {
                    from: account,
                    data: GivethDirectoryByteCode,
                    gas: 3000000,
                    value: opts.value || 0,
                },
                (err, _contract) => {
                    if (err) { cb2(err); return; }
                    if (typeof _contract.address !== "undefined") {
                        givethDirectory = new GivethDirectory(web3, _contract.address);
                        cb2();
                    }
                });
        },
    ],
    (err) => {
        if (err) return cb(err);
        cb(null, givethDirectory);
    });
}
