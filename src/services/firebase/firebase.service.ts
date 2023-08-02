import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { User } from "../../models/user.model";

export const loginEmailPasswordFirebase = async (email: string, password: string): Promise<any> => {
    let err = undefined;

    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const userFirebase = userCredential.user;
            const count = await User.count({ where: { email: email, firebaseID: userFirebase.uid } });
            if (count == 1)
                err = undefined
            else
                err = 'Email hoặc mật khẩu không đúng'

        })
        .catch((error) => {
            const errorMessage = error.message;
            if (errorMessage.includes('wrong-password'))
                err = 'Email hoặc mật khẩu không đúng'

            else
                err = errorMessage
        });
    return err;
}

// export const loginGoogleFirebase = async (token: string): Promise<any> => {
//     const auth = getAuth();
//     await signInWithEmailAndPassword(auth, email, password)
//         .then(async (userCredential) => {
//             const userFirebase = userCredential.user;
//             const count = await User.count({ where: { email: email, firebaseID: userFirebase.uid } });
//             if (count != 1)
//                 return 'Email hoặc mật khẩu không đúng'

//             return undefined
//         })
//         .catch((error) => {
//             const errorMessage = error.message;
//             if (errorMessage.includes('wrong-password'))
//                 return 'Email hoặc mật khẩu không đúng'
//             else
//                 return errorMessage
//         });
// }