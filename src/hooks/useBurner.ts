import { useCallback, useEffect, useState } from "react";
import {
    Account,
    AccountInterface,
    CallData,
    ec,
    hash,
    RpcProvider,
    stark,
    TransactionStatus,
} from "starknet";
import Storage from "../utils/storage";
import { BurnerConnector } from "../connectors/burner";
import { PREFUND_AMOUNT } from "../constants";

type BurnerStorage = {
    [address: string]: {
        privateKey: string;
        publicKey: string;
        deployTx: string;
        active: boolean;
    };
};

/**
 * Interface for Burner
 * 
 * @param masterAccount - The Master account is what prefunds the Burner. 
 *                        Pass in an account that has funds.
 * 
 * @param accountClassHash - The class hash of the account you want to deploy. 
 *                           This has to be predeployed on the chain you are deploying to.
 * 
 * @param provider - The provider you want to use to deploy the burner.
 * 
 */
interface Burner {
    /** argent, braavos, cartridge etc */
    masterAccount?: AccountInterface | Account;

    accountClassHash: string;

    provider: RpcProvider;
}

export const useBurner = ({ masterAccount, accountClassHash, provider }: Burner) => {
    const [account, setAccount] = useState<Account>();
    const [isDeploying, setIsDeploying] = useState(false);
    const [burnerAccounts, setburnerAccounts] = useState<BurnerConnector[]>([]);

    // load burner from storage
    useEffect(() => {
        const storage: BurnerStorage = Storage.get("burners");
        if (storage) {
            // check one to see if exists, perhaps appchain restarted
            const firstAddr = Object.keys(storage)[0];
            masterAccount?.getTransactionReceipt(storage[firstAddr].deployTx).catch(() => {
                setAccount(undefined);
                Storage.remove("burners");
                throw new Error("burners not deployed, chain may have restarted");
            });

            // set active account
            for (let address in storage) {
                if (storage[address].active) {
                    const burner = new Account(
                        provider,
                        address,
                        storage[address].privateKey,
                    );
                    setAccount(burner);
                    return;
                }
            }
        }
    }, []);

    // list burners
    const list = useCallback(() => {
        let storage = Storage.get("burners") || {};
        return Object.keys(storage).map((address) => {
            return {
                address,
                active: storage[address].active,
            };
        });
    }, [masterAccount]);

    // select burner
    const select = useCallback((address: string) => {
        let storage = Storage.get("burners") || {};
        if (!storage[address]) {
            throw new Error("burner not found");
        }

        for (let addr in storage) {
            storage[addr].active = false;
        }
        storage[address].active = true;

        Storage.set("burners", storage);
        const burner = new Account(provider, address, storage[address].privateKey);
        setAccount(burner);
    }, [masterAccount]);

    // get burner from address
    const get = useCallback((address: string) => {
        let storage = Storage.get("burners") || {};
        if (!storage[address]) {
            throw new Error("burner not found");
        }

        return new Account(provider, address, storage[address].privateKey);

    }, [masterAccount]);

    // create burner
    const create = useCallback(async () => {
        setIsDeploying(true);
        const privateKey = stark.randomAddress();
        const publicKey = ec.starkCurve.getStarkKey(privateKey);
        const address = hash.calculateContractAddressFromHash(
            publicKey,
            accountClassHash,
            CallData.compile({ publicKey }),
            0,
        );

        if (!masterAccount) {
            throw new Error("wallet account not found");
        }

        try {
            await prefundAccount(address, masterAccount);
        } catch (e) {
            setIsDeploying(false);
        }

        const accountOptions = {
            classHash: accountClassHash,
            constructorCalldata: CallData.compile({ publicKey }),
            addressSalt: publicKey,
        }

        // deploy burner
        const burner = new Account(provider, address, privateKey);

        // const accountDeployFee = await account?.estimateAccountDeployFee(accountOptions)
        const nonce = await account?.getNonce()

        const { transaction_hash: deployTx } = await burner.deployAccount(accountOptions,
            {
                nonce,
                maxFee: 0 // TODO: update
            }
        );

        console.log("Deploying:", deployTx)

        // save burner
        let storage = Storage.get("burners") || {};
        for (let address in storage) {
            storage[address].active = false;
        }

        storage[address] = {
            privateKey,
            publicKey,
            deployTx,
            active: true,
        };

        setAccount(burner);
        setIsDeploying(false);
        Storage.set("burners", storage);
        console.log("Burner Created: ", address);

        return burner;
    }, [masterAccount]);

    useEffect(() => {
        const burnerAccounts = [];
        const burners = list();

        for (const burner of burners) {
            const arcadeConnector = new BurnerConnector({
                options: {
                    id: burner.address,
                }
            }, get(burner.address));

            burnerAccounts.push(arcadeConnector);
        }

        setburnerAccounts(burnerAccounts);

        console.log(burnerAccounts)
    }, [account, isDeploying]);

    return {
        get,
        list,
        select,
        create,
        account,
        isDeploying,
        burnerAccounts
    };
};

const prefundAccount = async (address: string, account: AccountInterface) => {
    try {

        const transferOptions = {
            contractAddress: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            entrypoint: "transfer",
            calldata: CallData.compile([address, PREFUND_AMOUNT, "0x0"]),
        }

        const nonce = await account.getNonce()

        const { transaction_hash } = await account.execute(transferOptions,
            undefined,
            {
                nonce,
                maxFee: 0
            }
        );

        console.log("Prefund Account hash:", transaction_hash);

        const result = await account.waitForTransaction(transaction_hash, {
            retryInterval: 1000,
            successStates: [TransactionStatus.ACCEPTED_ON_L2],
        });

        if (!result) {
            throw new Error("Transaction did not complete successfully.");
        }

        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
};